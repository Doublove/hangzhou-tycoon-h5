/**
 * 回合调度器：以状态机驱动「月初 → 播报 → 掷骰 → 移动 → 落地 → 决策 → 回合结束 → 月末」。
 *
 * 设计要点（2.2 / 10.2）：
 *  1. 可自动推进的阶段由本文件的 step() 连续执行，需要玩家输入的阶段通过设置
 *     awaiting 暂停——这样「跳过动画 / 快速结算 / 批量模拟」共用同一条代码路径；
 *  2. 押收：不为 AI 开特权路径，AI 只产出 Command（A16）；
 *  3. 每条结算都会产生事件与日志，表现层只播放结果，不参与数值计算。
 */
import type { GameEvent, SeatIndex } from '@/types';
import {
  CFG,
  CHAPTER_MAP,
  HISTORY_EVENTS,
  POLICIES,
  REGIONS,
  TILE_MAP,
  TEXTS,
  cellKindOf,
} from '@/config';
import { nextInt, pickOne, weightedPick } from './rng';
import { pushLog, calendarOf, type GameState, type TurnPhase } from './state';
import { buyTile, clampHeat, commitMove, payToll, tileUnderFoot, cloneState } from './commands';
import { monthlyFlow, netWorth, regionTargetHeat } from './rules/economy';
import { resolveChanceCell, resolveDestinyCell, resolveSecuritiesCell } from './rules/cards';

/** 一回合的最大自动步数，防止异常情况下的死循环。 */
const MAX_STEPS = 64;

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * 推进到下一个「需要输入」的时刻。
 * 返回本次推进过程中产生的全部事件；awaiting === 'none' 表示局面已结束。
 */
export function step(s: GameState): StepResult {
  let state = cloneState(s);
  const events: GameEvent[] = [];
  let guard = 0;

  while (guard < MAX_STEPS) {
    guard += 1;
    if (state.finished) {
      state.awaiting = 'gameOver';
      break;
    }
    if (state.awaiting !== 'none') break;

    const before = state.phase;
    const produced = runPhase(state);
    events.push(...produced);
    if (state.phase === before && state.awaiting === 'none') {
      // 阶段未推进且无等待，说明存在规则漏洞，直接停机避免死循环
      console.error(`[turn] 阶段 ${before} 未能推进，已中断以防止死循环`);
      break;
    }
  }

  state.lastEvents = events;
  return { state, events };
}

/** 执行当前阶段。 */
function runPhase(state: GameState): GameEvent[] {
  switch (state.phase) {
    case 'monthStart':
      return phaseMonthStart(state);
    case 'broadcast':
      return phaseBroadcast(state);
    case 'roll':
      return phaseRoll(state);
    case 'move':
      return phaseMove(state);
    case 'landing':
      return phaseLanding(state);
    case 'decision':
      return phaseDecision(state);
    case 'turnEnd':
      return phaseTurnEnd(state);
    case 'monthEnd':
      return phaseMonthEnd(state);
    default:
      console.error(`[turn] 未知阶段：${state.phase}`);
      return [];
  }
}

function goto(state: GameState, phase: TurnPhase): void {
  state.phase = phase;
}

/** ① 月初结算：本月租金到账，支付利息、物业费与累进税（8.3）。 */
function phaseMonthStart(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const seat = state.activeSeat;
  const player = state.players[seat];
  if (player.bankrupt) {
    goto(state, 'turnEnd');
    return events;
  }

  const flow = monthlyFlow(state, seat);
  player.cash += flow.rentIncome;
  state.flow.injection += flow.rentIncome;
  const outgo = flow.interest + flow.upkeep + flow.tax;
  player.cash -= outgo;

  if (flow.rentIncome > 0) {
    pushLog(state, state.month, seat, 'income', `本月租金到账 ${flow.rentIncome.toFixed(0)} 万`);
  }
  if (outgo > 0) {
    pushLog(
      state,
      state.month,
      seat,
      'expense',
      `利息 ${flow.interest.toFixed(0)} / 物业 ${flow.upkeep.toFixed(0)} / 税费 ${flow.tax.toFixed(0)} 万`,
    );
  }

  // 若有本月历史事件，先进入播报；否则直接进入掷骰
  const { year, month } = calendarOf(state);
  const due = HISTORY_EVENTS.filter(
    (e) => e.year === year && e.month === month && !state.firedHistory.includes(e.id),
  );
  state.pendingBroadcasts = due.map((e) => e.id);
  goto(state, due.length > 0 ? 'broadcast' : 'roll');
  return events;
}

/** ② 时局播报：结算历史事件的全局影响并加入政策（第四章 / 第五章）。 */
function phaseBroadcast(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const eventId = state.pendingBroadcasts[0];
  if (!eventId) {
    goto(state, 'roll');
    return events;
  }
  const cfg = HISTORY_EVENTS.find((e) => e.id === eventId);
  if (!cfg) {
    state.pendingBroadcasts.shift();
    goto(state, 'roll');
    return events;
  }
  state.firedHistory.push(cfg.id);
  state.pendingBroadcasts.shift();
  events.push({ t: 'historyEvent', eventId: cfg.id });
  pushLog(state, state.month, null, 'event', `${cfg.title}：${cfg.desc}`);

  cfg.effects.forEach((effect) => {
    switch (effect.kind) {
      case 'heatDelta': {
        applyHeatDelta(state, effect.regionId ?? 'all', effect.amount);
        break;
      }
      case 'priceDelta': {
        applyPriceDelta(state, effect.regionId ?? 'all', effect.amount);
        break;
      }
      case 'levelCap': {
        Object.values(state.tiles).forEach((tile) => {
          if (effect.regionId === 'all' || TILE_MAP[tile.id].regionId === effect.regionId) {
            tile.levelCapBoost += effect.amount;
          }
        });
        break;
      }
      case 'policy': {
        if (effect.policyId) {
          const duration = effect.duration ?? 0;
          state.activePolicies.push({
            id: effect.policyId,
            expireTurn: duration > 0 ? state.turn + duration * state.players.length : -1,
          });
          if (effect.policyId === 'dongJie') {
            const regions = REGIONS.map((r) => r.id);
            const picked = pickOne(state.rng, 'negativeRegion', regions);
            state.rng = picked.rng;
            state.frozenRegion = picked.value;
          }
          events.push({ t: 'policyActivated', policyId: effect.policyId });
          pushLog(state, state.month, null, 'policy', `政策生效：${POLICIES.find((p) => p.id === effect.policyId)?.name ?? ''}`);
        }
        break;
      }
      case 'rentMul': {
        applyPriceDelta(state, effect.regionId ?? 'all', effect.amount / 2);
        break;
      }
      default:
        break;
    }
  });

  goto(state, state.pendingBroadcasts.length > 0 ? 'broadcast' : 'roll');
  return events;
}

function applyHeatDelta(state: GameState, regionId: string, amount: number): void {
  const targets = regionId === 'all' ? REGIONS.map((r) => r.id) : [regionId];
  targets.forEach((id) => {
    state.heat[id] = clampHeat((state.heat[id] ?? 50) + amount);
  });
}

function applyPriceDelta(state: GameState, regionId: string, percent: number): void {
  const targets = regionId === 'all'
    ? Object.values(state.tiles).map((t) => t.id)
    : Object.values(state.tiles)
        .filter((t) => TILE_MAP[t.id].regionId === regionId)
        .map((t) => t.id);
  targets.forEach((id) => {
    const tile = state.tiles[id];
    tile.priceBoost = Number((tile.priceBoost + percent / 100).toFixed(6));
  });
}

/**
 * 监狱出狱判定（A9）：偶数即出狱；连续 3 次未中，第 4 个回合强制释放。
 * 抽出为独立函数，便于验收测试直接对分布做采样。
 */
export function resolveJailRoll(
  state: GameState,
  seat: SeatIndex,
): { released: boolean; reason: 'even' | 'forced'; attempts: number } {
  const player = state.players[seat];
  const res = nextInt(state.rng, 'dice', CFG.diceMin, CFG.diceMax);
  state.rng = res.rng;
  const even = res.value % 2 === 0;
  const forced = player.jailAttempts >= CFG.jailMaxTurns - 1;
  if (even || forced) {
    player.jailTurns = 0;
    player.jailAttempts = 0;
    return { released: true, reason: even ? 'even' : 'forced', attempts: player.jailAttempts };
  }
  player.jailAttempts += 1;
  return { released: false, reason: 'even', attempts: player.jailAttempts };
}

/** ③ 掷骰：被限制（监狱 / 风景区）时不移动，直接跳过到回合结束。 */
function phaseRoll(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const seat = state.activeSeat;
  const player = state.players[seat];

  if (player.scenicTurns > 0) {
    player.scenicTurns -= 1;
    pushLog(state, state.month, seat, 'event', TEXTS.scenicHint.replace('{n}', String(player.scenicTurns)));
    goto(state, 'turnEnd');
    return events;
  }

  if (player.jailTurns > 0) {
    const outcome = resolveJailRoll(state, seat);
    if (outcome.released) {
      pushLog(state, state.month, seat, 'system', `离开监禁（${outcome.reason}）`);
    } else {
      pushLog(state, state.month, seat, 'event', TEXTS.jailHint);
      goto(state, 'turnEnd');
      return events;
    }
  }

  state.awaiting = 'roll';
  return events;
}

/** ④ 移动：应用 pendingMove 的结果（含经过起点与路障拦截）。 */
function phaseMove(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const seat = state.activeSeat;
  if (!state.pendingMove) {
    goto(state, 'landing');
    return events;
  }
  if (state.players[seat].stayFlag) {
    state.players[seat].stayFlag = false;
    state.pendingMove = null;
    goto(state, 'landing');
    return events;
  }
  commitMove(state, seat, events);
  goto(state, 'landing');
  return events;
}

/** ⑤ 落地结算：地块 / 功能格各有分支。 */
function phaseLanding(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const seat = state.activeSeat;
  const kind = cellKindOf(state.players[seat].position);
  const tileId = tileUnderFoot(state, seat);

  if (tileId) {
    const tile = state.tiles[tileId];
    if (tile.owner !== null && tile.owner !== seat) {
      payToll(state, seat, tileId, events);
    }
  } else if (kind === 'chance') {
    resolveChanceCell(state, seat, events);
  } else if (kind === 'destiny') {
    resolveDestinyCell(state, seat, events);
  } else if (kind === 'securities') {
    resolveSecuritiesCell(state, seat, events);
  } else if (kind === 'scenic') {
    // 风景区停留梯度 50/25/12/7/5/1 → 停在 1—6 个回合（A10）
    const weights: Record<string, number> = {};
    CFG.scenicWeights.forEach((w, i) => {
      weights[String(i + 1)] = w;
    });
    const picked = weightedPick(state.rng, 'dice', weights);
    state.rng = picked.rng;
    const turns = Number(picked.value);
    state.players[seat].scenicTurns = turns;
    events.push({ t: 'scenic', seat, turns });
    pushLog(state, state.month, seat, 'event', `西湖风景区：停留 ${turns} 个回合`);
  }

  state.awaiting = 'decision';
  goto(state, 'decision');
  return events;
}

/** ⑥ 决策：等待玩家/AI 的指令；此阶段本身不自动推进。 */
function phaseDecision(state: GameState): GameEvent[] {
  void state;
  return [];
}

/** ⑦ 回合结束：技能冷却递减，交给下一位或进入月末结算。 */
function phaseTurnEnd(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const seat = state.activeSeat;
  const player = state.players[seat];
  if (player.skillCooldown > 0) player.skillCooldown -= 1;

  const lastSeat = state.players.length - 1;
  if (seat >= lastSeat) {
    goto(state, 'monthEnd');
  } else {
    state.activeSeat = (seat + 1) as SeatIndex;
    goto(state, 'monthStart');
  }
  return events;
}

/** ⑧ 月末结算：解锁地块、热度回归、到期政策、破产判定、月份推进（A1 / A4 / A12）。 */
function phaseMonthEnd(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const chapter = CHAPTER_MAP[state.chapterId];
  const absolute = (chapter.startYear - 2010) * 12 + state.month + 1;

  // 地块挂牌（A4）
  Object.values(state.tiles).forEach((tile) => {
    if (tile.unlocked) {
      tile.heldTurns += 1;
      return;
    }
    const cfg = TILE_MAP[tile.id];
    const unlockAbsolute = (cfg.unlockYear - 2010) * 12 + (cfg.unlockMonth - 1);
    if (absolute >= unlockAbsolute) {
      tile.unlocked = true;
      pushLog(state, state.month, null, 'system', `${cfg.name} 挂牌，可以买了`);
    }
  });

  // 热度自然回归（3.6）
  REGIONS.forEach((region) => {
    const target = regionTargetHeat(region.id);
    const current = state.heat[region.id] ?? region.baseHeat;
    const noiseRes = nextInt(state.rng, 'heat', -CFG.heatNoise, CFG.heatNoise);
    state.rng = noiseRes.rng;
    state.heat[region.id] = clampHeat(current + (target - current) * CFG.heatDrift + noiseRes.value * 0.5);
  });

  // 到期政策
  const expired = state.activePolicies.filter((p) => p.expireTurn >= 0 && p.expireTurn <= state.turn);
  state.activePolicies = state.activePolicies.filter((p) => !(p.expireTurn >= 0 && p.expireTurn <= state.turn));
  expired.forEach((p) => {
    if (p.id === 'dongJie') state.frozenRegion = null;
    events.push({ t: 'policyExpired', policyId: p.id });
    pushLog(state, state.month, null, 'policy', `政策到期：${p.id}`);
  });

  // 破产判定（A12）
  state.players.forEach((p, idx) => {
    if (p.bankrupt) return;
    const nw = netWorth(state, idx as SeatIndex);
    if (nw < 0) {
      startLiquidation(state, idx as SeatIndex, events);
    } else if (p.liquidationStartMonth >= 0) {
      p.liquidationStartMonth = -1;
      pushLog(state, state.month, idx as SeatIndex, 'system', '债务清偿完毕，解除清算');
    }
    const inLiquidation = state.players[idx].liquidationStartMonth >= 0;
    if (inLiquidation && state.month - state.players[idx].liquidationStartMonth >= CFG.liquidationMonths) {
      eliminatePlayer(state, idx as SeatIndex, events);
    }
  });

  state.month += 1;
  state.turn += 1;
  state.awaiting = 'none';
  events.push({ t: 'monthAdvanced', month: state.month });

  const aliveCount = state.players.filter((p) => !p.bankrupt).length;
  if (state.month >= chapter.turns || aliveCount <= 1) {
    state.finished = true;
    state.awaiting = 'gameOver';
    return events;
  }

  state.activeSeat = 0;
  goto(state, 'monthStart');
  return events;
}

/** 第一级：资不抵债 → 强制拍卖（8.5）。 */
function startLiquidation(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat);
  owned.forEach((tile) => {
    const price = TILE_MAP[tile.id].price * CFG.auctionPriceRate;
    const buyer = state.players.find((p) => !p.bankrupt && p.cash >= price);
    if (buyer) {
      buyer.cash -= price;
      state.players[seat].cash += price;
      tile.owner = buyer.seat;
      tile.acquiredMonth = state.month;
    } else {
      state.players[seat].cash += TILE_MAP[tile.id].price * CFG.bankFallbackRate;
      tile.owner = null;
      tile.level = 0;
    }
  });
  state.players[seat].liquidationStartMonth = state.month;
  events.push({ t: 'liquidationStarted', seat });
  pushLog(state, state.month, seat, 'system', '资不抵债，资产被强制拍卖，进入 3 个月清算期');
}

/** 第二级：清算期满仍未清偿 → 出局（8.5）。 */
function eliminatePlayer(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  state.players[seat].bankrupt = true;
  Object.values(state.tiles).forEach((tile) => {
    if (tile.owner === seat) {
      tile.owner = null;
      tile.level = 0;
      tile.barrierAt = null;
    }
  });
  events.push({ t: 'bankrupted', seat });
  pushLog(state, state.month, seat, 'system', '清算期满，宣告破产出局');
}

/** 供 AI 与 UI 复用：购买脚下地块的快捷入口。 */
export function tryBuyCurrentTile(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const tileId = tileUnderFoot(state, state.activeSeat);
  if (tileId) buyTile(state, state.activeSeat, events);
  return events;
}

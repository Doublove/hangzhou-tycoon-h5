/**
 * 命令管道：状态变更的唯一入口（A16：AI 与人类共用同一套接口）。
 *
 * 约定：applyCommand 为纯函数，返回新状态与表现层可播放的事件列表；
 * 任何一处数值计算都必须委托向 rules/*，本文件不自带魔法数字。
 */
import type { Direction, GameEvent, ItemKind, SeatIndex, TileLevel } from '@/types';
import {
  CFG,
  CHAPTER_MAP,
  ROLE_MAP,
  TILE_MAP,
  advance,
  cellKindOf,
  crossedStart,
} from '@/config';
import { chance, nextInt, weightedPick, type RngPurpose } from './rng';
import {
  activePolicyIds,
  pushLog,
  type GameState,
} from './state';
import {
  tilePrice,
  leverageOf,
  levelCapOf,
  loanLimitOf,
  netWorth,
  sellProceeds,
  upgradeCost,
} from './rules/economy';
import { computeToll } from './rules/toll';
import { itemShopPrice } from './rules/cards';

export type Command =
  | { t: 'rollDice'; forced?: number }
  | { t: 'buyTile' }
  | { t: 'upgradeTile'; tileId: string }
  | { t: 'sellTile'; tileId: string }
  | { t: 'takeLoan'; amount: number }
  | { t: 'repayLoan'; amount: number }
  | { t: 'useItem'; item: ItemKind; arg?: number }
  | { t: 'buyItem'; item: ItemKind }
  | { t: 'useSkill' }
  | { t: 'ackCard' }
  | { t: 'endDecision' };

/** 深拷贝：嵌套对象按层浅拷贝，deck / cells 为只读引用不复制。 */
export function cloneState(s: GameState): GameState {
  const tiles: typeof s.tiles = {};
  Object.keys(s.tiles).forEach((k) => {
    tiles[k] = { ...s.tiles[k] };
  });
  return {
    ...s,
    rng: { seed: s.rng.seed, streams: { ...s.rng.streams } },
    cells: s.cells,
    tiles,
    heat: { ...s.heat },
    players: s.players.map((p) => ({ ...p, items: { ...p.items } })),
    activePolicies: s.activePolicies.map((p) => ({ ...p })),
    pendingBroadcasts: [...s.pendingBroadcasts],
    firedHistory: [...s.firedHistory],
    pendingMove: s.pendingMove ? { ...s.pendingMove } : null,
    deck: s.deck,
    log: [...s.log],
    flow: { ...s.flow },
    lastEvents: [],
  };
}

export interface CommandResult {
  next: GameState;
  events: GameEvent[];
}

/** 玩家当前所在地块的 id（非地块格返回 null）。 */
export function tileUnderFoot(state: GameState, seat: SeatIndex): string | null {
  const cell = state.cells[state.players[seat].position];
  return cell && cell.kind === 'tile' ? cell.tileId : null;
}

/** 是否允许买地：地块无主、已挂牌、政策允许、板块未冻结。 */
export function canBuy(state: GameState, seat: SeatIndex, tileId: string): boolean {
  const tile = state.tiles[tileId];
  if (!tile || tile.owner !== null || !tile.unlocked) return false;
  const policies = activePolicyIds(state);
  if (policies.includes('dongJie') && state.frozenRegion === TILE_MAP[tileId].regionId) return false;
  if (policies.includes('xianGou')) {
    const owned = Object.values(state.tiles).filter((t) => t.owner === seat).length;
    if (owned >= (CFG.maxTilesUnderRestriction ?? 2)) return false;
  }
  const price = tilePrice(state, tileId);
  return state.players[seat].cash >= price;
}

/** 是否允许升级：达到等级上限前、资金充足。 */
export function canUpgrade(state: GameState, seat: SeatIndex, tileId: string): boolean {
  const tile = state.tiles[tileId];
  if (!tile || tile.owner !== seat) return false;
  const cap = levelCapOf(state, tileId);
  if (tile.level >= cap) return false;
  const heat = state.heat[TILE_MAP[tileId].regionId] ?? 50;
  if (heat < CFG.vacancyHalfHeat) return false;
  return state.players[seat].cash >= upgradeCost(state, tileId);
}

/** 是否允许卖出：不在限售期内且未被限售政策锁死。 */
export function canSell(state: GameState, seat: SeatIndex, tileId: string): boolean {
  const tile = state.tiles[tileId];
  if (!tile || tile.owner !== seat) return false;
  const policies = activePolicyIds(state);
  if (policies.includes('xianShou') && tile.heldTurns < CFG.minHoldTurns) return false;
  return true;
}

/** 最大可偿还款项：不超过欠款，也不超过手头现金。 */
export function maxRepay(state: GameState, seat: SeatIndex): number {
  return Math.min(state.players[seat].debt, Math.max(0, state.players[seat].cash));
}

export function applyCommand(s: GameState, c: Command): CommandResult {
  const next = cloneState(s);
  const events: GameEvent[] = [];
  const seat = next.activeSeat;

  switch (c.t) {
    case 'rollDice': {
      rollDice(next, seat, c.forced, events);
      break;
    }
    case 'buyTile': {
      buyTile(next, seat, events);
      break;
    }
    case 'upgradeTile': {
      upgradeTile(next, seat, c.tileId, events);
      break;
    }
    case 'sellTile': {
      sellTile(next, seat, c.tileId, events);
      break;
    }
    case 'takeLoan': {
      takeLoan(next, seat, c.amount, events);
      break;
    }
    case 'repayLoan': {
      repayLoan(next, seat, c.amount, events);
      break;
    }
    case 'useItem': {
      useItem(next, seat, c.item, c.arg, events);
      break;
    }
    case 'buyItem': {
      buyItem(next, seat, c.item, events);
      break;
    }
    case 'useSkill': {
      useSkill(next, seat, events);
      break;
    }
    case 'ackCard': {
      next.pendingBroadcasts.shift();
      break;
    }
    case 'endDecision': {
      next.awaiting = 'none';
      next.phase = 'turnEnd';
      break;
    }
    default: {
      console.error('[commands] 未知命令', c);
    }
  }

  next.lastEvents = events;
  return { next, events };
}

/** 掷骰：支持注入固定点数以便 A9 / A10 的固定序列测试。 */
export function rollDice(state: GameState, seat: SeatIndex, forced: number | undefined, events: GameEvent[]): void {
  const player = state.players[seat];
  let value: number;
  if (typeof forced === 'number') {
    value = forced;
  } else {
    const res = nextInt(state.rng, 'dice', CFG.diceMin, CFG.diceMax);
    state.rng = res.rng;
    value = res.value;
  }
  const skillBonus = player.pendingDiceBonus;
  const steps = Math.max(1, value + skillBonus);
  player.pendingDiceBonus = 0;
  player.queuedDice = null;
  state.pendingMove = { from: player.position, steps, direction: player.direction, walked: 0 };
  state.awaiting = 'none';
  state.phase = 'move';
}

/**
 * 完成移动：结算经过起点，并处理路障拦截。
 * 监狱位于棋盘中心而非环上格子，因此不存在「落在监狱格」的分支（V2.0 / D-04）。
 */
export function commitMove(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const move = state.pendingMove;
  if (!move) return;
  const player = state.players[seat];
  const { steps, direction } = move;
  const landing = advance(move.from, steps, direction);

  if (crossedStart(move.from, steps, direction)) {
    const salary = CFG.passGoBase + player.cash * CFG.passGoRate;
    player.cash += salary;
    state.flow.injection += salary;
    events.push({ t: 'passedGo', seat, amount: salary });
    pushLog(state, state.month, seat, 'income', `经过起点，月供 ${formatMoney(salary)}`);
  }

  player.position = landing;
  state.pendingMove = null;

  const barrierHolder = Object.values(state.tiles).find((t) => t.barrierAt === landing);
  if (barrierHolder) {
    barrierHolder.barrierAt = null;
    const stepsBack = Math.max(1, steps - 1);
    const held = advance(landing, -stepsBack, direction as Direction);
    player.position = held;
    pushLog(state, state.month, seat, 'event', '撞上路障，被拦停在原地');
  }
}

/** 买下脚下的地块。 */
export function buyTile(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const tileId = tileUnderFoot(state, seat);
  if (!tileId || !canBuy(state, seat, tileId)) return;
  const price = tilePrice(state, tileId);
  const player = state.players[seat];
  player.cash -= price;
  const tile = state.tiles[tileId];
  tile.owner = seat;
  tile.acquiredMonth = state.month;
  events.push({ t: 'tileBought', seat, tileId, price });
  pushLog(state, state.month, seat, 'expense', `买下 ${TILE_MAP[tileId].name}，支出 ${formatMoney(price)}`);
}

/** 升级自己的地块。 */
export function upgradeTile(state: GameState, seat: SeatIndex, tileId: string, events: GameEvent[]): void {
  if (!canUpgrade(state, seat, tileId)) return;
  const cost = upgradeCost(state, tileId);
  const player = state.players[seat];
  const tile = state.tiles[tileId];
  player.cash -= cost;
  tile.level = (tile.level + 1) as TileLevel;
  events.push({ t: 'tileUpgraded', seat, tileId, level: tile.level, cost });
  pushLog(state, state.month, seat, 'expense', `${TILE_MAP[tileId].name} 升到 Lv${tile.level}，支出 ${formatMoney(cost)}`);
}

/** 卖出一宗地块。 */
export function sellTile(state: GameState, seat: SeatIndex, tileId: string, events: GameEvent[]): void {
  if (!canSell(state, seat, tileId)) return;
  const proceeds = sellProceeds(state, tileId, seat);
  state.players[seat].cash += proceeds;
  const tile = state.tiles[tileId];
  tile.owner = null;
  tile.level = 0;
  tile.stalled = false;
  tile.barrierAt = null;
  events.push({ t: 'tileSold', seat, tileId, amount: proceeds });
  pushLog(state, state.month, seat, 'income', `卖出 ${TILE_MAP[tileId].name}，回笼 ${formatMoney(proceeds)}`);
}

/** 贷款。 */
export function takeLoan(state: GameState, seat: SeatIndex, amount: number, events: GameEvent[]): void {
  const limit = loanLimitOf(state, seat);
  const granted = Math.max(0, Math.min(amount, limit, CFG.loanSingleCap));
  if (granted <= 0) return;
  state.players[seat].cash += granted;
  state.players[seat].debt += granted;
  events.push({ t: 'loanTaken', seat, amount: granted });
  pushLog(state, state.month, seat, 'income', `贷款 ${formatMoney(granted)}，杠杆 ${formatPercent(leverageOf(state, seat))}`);
}

/** 还款。 */
export function repayLoan(state: GameState, seat: SeatIndex, amount: number, events: GameEvent[]): void {
  const pay = Math.max(0, Math.min(amount, maxRepay(state, seat)));
  if (pay <= 0) return;
  state.players[seat].cash -= pay;
  state.players[seat].debt -= pay;
  events.push({ t: 'loanRepaid', seat, amount: pay });
  pushLog(state, state.month, seat, 'expense', `还款 ${formatMoney(pay)}`);
}

/** 使用道具（3.10）。 */
export function useItem(state: GameState, seat: SeatIndex, item: ItemKind, arg: number | undefined, events: GameEvent[]): void {
  const player = state.players[seat];
  if (player.items[item] <= 0) return;
  if ((player.jailTurns > 0 || player.scenicTurns > 0) && item !== 'remoteDice') return;

  switch (item) {
    case 'remoteDice': {
      if (typeof arg === 'number' && arg >= CFG.diceMin && arg <= CFG.diceMax) {
        player.queuedDice = arg;
        rollDice(state, seat, arg, events);
      }
      break;
    }
    case 'stay': {
      player.stayFlag = true;
      break;
    }
    case 'uTurn': {
      player.direction = (player.direction === 1 ? -1 : 1) as Direction;
      break;
    }
    case 'barrier': {
      const target = typeof arg === 'number' ? arg : player.position;
      const cell = state.cells[target];
      const tileId = cell?.tileId ?? null;
      if (tileId && state.tiles[tileId]?.owner === seat && target !== 0) {
        state.tiles[tileId].barrierAt = target;
      }
      break;
    }
    default:
      break;
  }
  player.items[item] -= 1;
  events.push({ t: 'itemGained', seat, item });
}

/** 道具商店购买（V1.8）：售价 = 总资产 × 3%，下限 10 万。 */
export function buyItem(state: GameState, seat: SeatIndex, item: ItemKind, events: GameEvent[]): void {
  const price = itemShopPrice(state, seat);
  if (state.players[seat].cash < price) return;
  state.players[seat].cash -= price;
  state.players[seat].items[item] += 1;
  events.push({ t: 'itemGained', seat, item });
  pushLog(state, state.month, seat, 'expense', `在道具店买入 ${item}，支出 ${price.toFixed(0)} 万`);
}

/** 主动技能（6.5）。 */
export function useSkill(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const player = state.players[seat];
  const role = ROLE_MAP[player.roleId];
  if (!role || player.skillCooldown > 0) return;
  switch (role.skill.kind) {
    case 'cashByNetworth': {
      const amount = Math.max(80, netWorth(state, seat) * role.skill.magnitude);
      player.cash += amount;
      pushLog(state, state.month, seat, 'income', `${role.skill.name}：到账 ${formatMoney(amount)}`);
      break;
    }
    case 'leverage': {
      const amount = netWorth(state, seat) * role.skill.magnitude;
      player.cash += amount;
      player.debt += amount;
      pushLog(state, state.month, seat, 'income', `${role.skill.name}：配资 ${formatMoney(amount)}`);
      break;
    }
    case 'escape': {
      player.jailTurns = 0;
      player.scenicTurns = 0;
      player.pendingDiceBonus = role.skill.magnitude;
      break;
    }
    case 'heatBoost': {
      const counts: Record<string, number> = {};
      Object.values(state.tiles).forEach((t) => {
        if (t.owner === seat) {
          const regionId = TILE_MAP[t.id].regionId;
          counts[regionId] = (counts[regionId] ?? 0) + 1;
        }
      });
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (best) {
        state.heat[best[0]] = clampHeat(state.heat[best[0]] + role.skill.magnitude);
      }
      break;
    }
    case 'discountBuy': {
      const candidates = Object.values(state.tiles).filter((t) => t.owner === null && t.unlocked);
      const cheapest = candidates.sort((a, b) => tilePrice(state, a.id) - tilePrice(state, b.id))[0];
      if (cheapest) {
        const price = tilePrice(state, cheapest.id) * role.skill.magnitude;
        if (player.cash >= price) {
          player.cash -= price;
          cheapest.owner = seat;
          cheapest.acquiredMonth = state.month;
          events.push({ t: 'tileBought', seat, tileId: cheapest.id, price });
        }
      }
      break;
    }
    default:
      break;
  }
  player.skillCooldown = role.skill.cooldownMonths;
  events.push({ t: 'skillUsed', seat, roleId: role.id });
}

/** 支付过路费给地主；带 Blockchain 上限保护与连片加成（A5 / A6）。 */
export function payToll(state: GameState, payer: SeatIndex, tileId: string, events: GameEvent[]): void {
  const tile = state.tiles[tileId];
  if (!tile || tile.owner === null || tile.owner === payer) return;
  const result = computeToll(state, tileId, payer);
  const amount = Math.min(result.amount, Math.max(0, state.players[payer].cash));
  const owner = tile.owner;
  state.players[payer].cash -= amount;
  state.players[owner].cash += amount;
  state.flow.transfer += amount;
  events.push({ t: 'tollPaid', from: payer, to: owner, tileId, amount, adjacency: result.adjacency });
  pushLog(
    state,
    state.month,
    payer,
    'expense',
    `踩到 ${TILE_MAP[tileId].name}${result.adjacency ? '（连片）' : ''}，过路费 ${formatMoney(amount)}`,
  );
}

export function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function formatMoney(value: number): string {
  return `${value.toFixed(0)} 万`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 道具掉落（3.10 权重表）。 */
export function rollItemDrop(state: GameState, seat: SeatIndex, purpose: RngPurpose, probability: number): ItemKind | null {
  const hit = chance(state.rng, purpose, probability);
  state.rng = hit.rng;
  if (!hit.value) return null;
  const picked = weightedPick(state.rng, purpose, CFG.itemDropWeights as Record<ItemKind, number>);
  state.rng = picked.rng;
  state.players[seat].items[picked.value] += 1;
  return picked.value;
}

/** 章节是否已进行到目标回合数（A1 / 2.3）。 */
export function chapterTurns(state: GameState): number {
  return CHAPTER_MAP[state.chapterId].turns;
}

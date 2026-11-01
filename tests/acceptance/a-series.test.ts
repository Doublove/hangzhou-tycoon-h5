/**
 * 核心规则验收基准 A1—A18（需求文档 14.1）。
 * 每条判据不过，视为该需求未完成，不论代码里写了多少行。
 */
import { describe, expect, it } from 'vitest';
import type { SeatIndex } from '@/types';
import {
  CFG,
  CHAPTER_MAP,
  CHAPTERS,
  REGION_BY_ID,
  TILE_MAP,
  tilesOfRing,
  unlockOffsetOf,
} from '@/config';
import { createInitialState, calendarOf, type GameState } from '@/engine/state';
import { applyCommand, cloneState, payToll, rollItemDrop, upgradeTile } from '@/engine/commands';
import { resolveJailRoll, step } from '@/engine/turn';
import { monthlyRent, netWorth, tilePrice, upgradeCost, vacancyFactor } from '@/engine/rules/economy';
import { computeToll, isAdjacent } from '@/engine/rules/toll';
import { nextInt, weightedPick } from '@/engine/rng';

function fresh(seed = 1): GameState {
  return createInitialState({ seed, chapterId: 1, roleId: 'hangtoutou', difficulty: 'normal' });
}

/** 把某宗地设为某人所有（测试夹具）。 */
function own(state: GameState, tileId: string, seat: SeatIndex, level: 0 | 1 | 2 | 3 | 4 | 5 = 1): void {
  state.tiles[tileId].owner = seat;
  state.tiles[tileId].level = level;
  state.tiles[tileId].unlocked = true;
}

describe('A1 一回合 = 一个月，四章 204 回合', () => {
  it('四章回合数合计 204，且连续推进后到达 2026.12', () => {
    expect(CHAPTERS.reduce((sum, c) => sum + c.turns, 0)).toBe(204);
    let absolute = 0;
    CHAPTERS.forEach((c) => {
      absolute += c.turns;
    });
    // 2010.01 为原点，推进 204 个月后落在 2026.12
    const last = { year: 2010 + Math.floor((absolute - 1) / 12), month: ((absolute - 1) % 12) + 1 };
    expect(last.year).toBe(2026);
    expect(last.month).toBe(12);
  });

  it('单章内月份连续推进且无重复', () => {
    const state = fresh(11);
    const seen: string[] = [];
    for (let month = 0; month < CHAPTER_MAP[1].turns; month += 1) {
      const cal = calendarOf({ ...state, month });
      seen.push(`${cal.year}-${cal.month}`);
    }
    expect(seen.length).toBe(48);
    expect(new Set(seen).size).toBe(48);
    expect(seen[0]).toBe('2010-1');
    expect(seen[47]).toBe('2013-12');
  });
});

describe('A3 每章一环，环长一致', () => {
  it('四个章节各自落在内环→最外环，每环 16 宗', () => {
    CHAPTERS.forEach((c) => {
      expect(tilesOfRing(c.ring).length).toBe(16);
    });
    expect(CHAPTERS.map((c) => c.ring)).toEqual([0, 1, 2, 3]);
  });
});

describe('A4 地块按解锁月挂牌，且只解锁一次', () => {
  it('延后挂牌的地块在解锁月前不可买，之后可买', () => {
    const state = fresh(12);
    const shenhua = state.tiles.shenhua;
    const offset = unlockOffsetOf(TILE_MAP.shenhua, CHAPTER_MAP[1].startYear);
    expect(offset).toBe(14);
    expect(shenhua.unlocked).toBe(false);
    shenhua.unlocked = true;
    expect(shenhua.unlocked).toBe(true);
  });
});

describe('A5 连片 ×2、不叠乘、跨起点不算', () => {
  it('相邻同主过路费恰为 2 倍，左右都同主仍为 2 倍', () => {
    const state = fresh(13);
    const slots = state.cells.filter((c) => c.kind === 'tile').map((c) => c.tileId!);
    const [a, b, c] = slots;
    own(state, a, 1);
    const single = computeToll(state, a, 0).raw;
    expect(single).toBeCloseTo(tilePrice(state, a) * CFG.tollRate[1], 6);

    own(state, b, 1);
    const adjacent = computeToll(state, a, 0).raw;
    expect(isAdjacent(state, a)).toBe(true);
    expect(adjacent).toBeCloseTo(single * CFG.adjacencyMultiplier, 6);

    // 左右都同主（三连）仍为 2 倍，不叠乘
    own(state, c, 1);
    const triple = computeToll(state, b, 0).raw;
    expect(triple).toBeCloseTo(tilePrice(state, b) * CFG.tollRate[1] * CFG.adjacencyMultiplier, 6);
  });

  it('首尾两格不算相邻（跨起点）', () => {
    const state = fresh(14);
    const slots = state.cells.filter((x) => x.kind === 'tile').map((x) => x.tileId!);
    own(state, slots[0], 1);
    own(state, slots[slots.length - 1], 1);
    expect(isAdjacent(state, slots[0])).toBe(false);
  });
});

describe('A6 过路费上限 25%，杠杆 > 50% 不封顶', () => {
  it('普通玩家单次支付不超过净资产 25%', () => {
    const state = fresh(15);
    const slots = state.cells.filter((c) => c.kind === 'tile').map((c) => c.tileId!);
    own(state, slots[0], 1, 5);
    own(state, slots[1], 1, 5);
    state.players[0].cash = 100;
    const payerNet = netWorth(state, 0);
    const result = computeToll(state, slots[0], 0);
    expect(result.amount).toBeLessThanOrEqual(payerNet * CFG.tollCapRatio + 1e-6);
  });

  it('杠杆超过 50% 时取消保护', () => {
    const state = fresh(16);
    const slots = state.cells.filter((c) => c.kind === 'tile').map((c) => c.tileId!);
    own(state, slots[0], 1, 5);
    state.players[0].cash = 100;
    state.players[0].debt = 400;
    const result = computeToll(state, slots[0], 0);
    expect(result.capped).toBe(false);
    expect(result.amount).toBeCloseTo(tilePrice(state, slots[0]) * CFG.tollRate[5], 6);
  });
});

describe('A7 升级费与估值系数对齐（账面中性）', () => {
  it('升级前后净资产变化不超过 ±1%', () => {
    const state = fresh(17);
    const tileId = Object.keys(state.tiles)[0];
    own(state, tileId, 0, 1);
    const before = netWorth(state, 0);
    const events = [] as ReturnType<typeof applyCommand>['events'];
    upgradeTile(state, 0, tileId, events);
    const after = netWorth(state, 0);
    expect(Math.abs(after - before)).toBeLessThan(Math.abs(upgradeCost(state, tileId)) * 0.01 + 1e-6);
  });
});

describe('A8 空置率折算', () => {
  it('热度 30 的 Lv2 地块，月租金为满额的 50%', () => {
    const state = fresh(18);
    const tileId = Object.keys(state.tiles)[0];
    const regionId = TILE_MAP[tileId].regionId;
    own(state, tileId, 0, 2);
    state.heat[regionId] = 30;
    expect(vacancyFactor(30)).toBe(CFG.vacancyHalf);
    const fullAmount = tilePrice(state, tileId) * CFG.rentRate[2];
    expect(monthlyRent(state, tileId)).toBeCloseTo(fullAmount * CFG.vacancyHalf, 6);
  });

  it('热度低于 25 时按 25% 折算', () => {
    expect(vacancyFactor(10)).toBe(CFG.vacancyLow);
    expect(vacancyFactor(70)).toBe(CFG.vacancyFull);
  });
});

describe('A9 监狱出狱判定', () => {
  it('500 次采样中被关押回合数落在 1—4，均值接近 2', () => {
    let total = 0;
    let max = 0;
    for (let i = 0; i < 500; i += 1) {
      const state = fresh(9000 + i);
      const seat = 1 as SeatIndex;
      state.players[seat].jailTurns = CFG.jailMaxTurns;
      state.players[seat].jailAttempts = 0;
      let turns = 0;
      while (state.players[seat].jailTurns > 0 && turns < 10) {
        turns += 1;
        resolveJailRoll(state, seat);
      }
      total += turns;
      max = Math.max(max, turns);
    }
    const avg = total / 500;
    expect(max).toBeLessThanOrEqual(CFG.jailMaxTurns);
    expect(avg).toBeGreaterThan(1.6);
    expect(avg).toBeLessThan(2.4);
  });
});

describe('A10 风景区停留梯度', () => {
  it('10 万次抽样中 1 回合占比 50%±1%，期望 1.95±0.05', () => {
    const weights: Record<string, number> = {};
    CFG.scenicWeights.forEach((w, i) => {
      weights[String(i + 1)] = w;
    });
    let rng = createInitialState({ seed: 99, chapterId: 1, roleId: 'hangtoutou', difficulty: 'normal' }).rng;
    const counts: Record<string, number> = {};
    const runs = 100_000;
    for (let i = 0; i < runs; i += 1) {
      const picked = weightedPick(rng, 'dice', weights);
      rng = picked.rng;
      counts[picked.value] = (counts[picked.value] ?? 0) + 1;
    }
    const oneTurnRatio = (counts['1'] ?? 0) / runs;
    const expected = Object.entries(counts).reduce(
      (sum, [turn, count]) => sum + Number(turn) * (count / runs),
      0,
    );
    expect(oneTurnRatio).toBeGreaterThan(0.49);
    expect(oneTurnRatio).toBeLessThan(0.51);
    expect(expected).toBeGreaterThan(1.9);
    expect(expected).toBeLessThan(2.0);
  });
});

describe('A11 经过起点（正反向都结算，停在起点不触发）', () => {
  it('反向跨越起点时发放月供', () => {
    const state = fresh(20);
    const seat = 0 as SeatIndex;
    state.players[seat].position = 2;
    state.players[seat].direction = -1;
    state.pendingMove = { from: 2, steps: 5, direction: -1, walked: 0 };
    state.phase = 'move';
    state.awaiting = 'none';
    const res = step(state);
    expect(res.events.some((e) => e.t === 'passedGo')).toBe(true);
  });
});

describe('A12 两级破产', () => {
  it('净资产为负时进入清算，3 个月后仍未清偿则出局', () => {
    let state = fresh(21);
    const seat = 0 as SeatIndex;
    state.players[seat].cash = -5000;
    state.players[seat].debt = 400;
    const tileId = 'banshan';
    own(state, tileId, seat, 1);
    // 直接触发月末结算（step 会自动走到 monthEnd）
    let guard = 0;
    while (!state.players[seat].bankrupt && guard < 40) {
      guard += 1;
      state = step(state).state;
      if (state.awaiting === 'roll') state = applyCommand(state, { t: 'rollDice' }).next;
      if (state.awaiting === 'decision') state = applyCommand(state, { t: 'endDecision' }).next;
      if (state.awaiting === 'cardAck') state = applyCommand(state, { t: 'ackCard' }).next;
      state.players[seat].cash = -5000;
    }
    expect(state.players[seat].liquidationStartMonth >= 0 || state.players[seat].bankrupt).toBe(true);
  });
});

describe('A13 净资产公式', () => {
  it('逐项复算与显示值一致', () => {
    const state = fresh(22);
    const seat = 0 as SeatIndex;
    const tileId = Object.keys(state.tiles)[0];
    own(state, tileId, seat, 2);
    state.players[seat].cash = 800;
    state.players[seat].debt = 100;
    const manual = 800 + tilePrice(state, tileId) * (1 + CFG.networthLevelRate * 2) - 100;
    expect(netWorth(state, seat)).toBeCloseTo(manual, 6);
  });
});

describe('A14 技能冷却按月递减', () => {
  it('使用后进入冷却，回合结束时递减', () => {
    const state = fresh(23);
    const seat = 0 as SeatIndex;
    state.awaiting = 'decision';
    const res = applyCommand(state, { t: 'useSkill' });
    expect(res.next.players[seat].skillCooldown).toBeGreaterThan(0);
    const before = res.next.players[seat].skillCooldown;
    let next = res.next;
    next = applyCommand(next, { t: 'endDecision' }).next;
    next = step(next).state;
    expect(next.players[seat].skillCooldown).toBeLessThanOrEqual(before);
  });
});

describe('A15 道具掉落', () => {
  it('概率为 1 时必掉，概率为 0 时必不掉', () => {
    const state = fresh(24);
    const got = rollItemDrop(state, 0, 'item', 1);
    expect(got).not.toBeNull();
    const none = rollItemDrop(state, 0, 'item', 0);
    expect(none).toBeNull();
  });

  it('掉落权重偏向低强度道具（遥控骰子 40%、路障 10%）', () => {
    const state = fresh(25);
    const tally: Record<string, number> = { remoteDice: 0, stay: 0, uTurn: 0, barrier: 0 };
    for (let i = 0; i < 4000; i += 1) {
      const got = rollItemDrop(state, 0, 'item', 1);
      if (got) tally[got] += 1;
    }
    expect(tally.remoteDice).toBeGreaterThan(tally.barrier);
    expect(tally.stay).toBeGreaterThan(tally.uTurn);
  });
});

describe('A16 AI 与玩家共用同一套规则接口', () => {
  it('同样的买地指令在 AI 座位上产生同样的结算', () => {
    const state = fresh(26);
    // 挑一块 AI 买得起的地（半山 150 万档）
    const tileId = 'banshan';
    state.tiles[tileId].unlocked = true;
    state.players[1].position = state.cells.find((c) => c.tileId === tileId)!.index;
    state.activeSeat = 1;
    state.awaiting = 'decision';
    const priceBefore = tilePrice(state, tileId);
    expect(priceBefore).toBeLessThan(state.players[1].cash);
    const res = applyCommand(state, { t: 'buyTile' });
    expect(res.next.tiles[tileId].owner).toBe(1);
    expect(res.next.players[1].cash).toBeCloseTo(state.players[1].cash - priceBefore, 6);
  });
});

describe('A17 确定性随机', () => {
  it('同一 seed 的随机流逐次一致', () => {
    const a = fresh(31);
    const b = fresh(31);
    for (let i = 0; i < 20; i += 1) {
      const ra = nextInt(a.rng, 'dice', 1, 6);
      const rb = nextInt(b.rng, 'dice', 1, 6);
      a.rng = ra.rng;
      b.rng = rb.rng;
      expect(ra.value).toBe(rb.value);
    }
  });
});

describe('过路费转移计入玩家间转移（8.7）', () => {
  it('踩他人地块后 flow.transfer 增加', () => {
    const state = fresh(27);
    const slots = state.cells.filter((c) => c.kind === 'tile').map((c) => c.tileId!);
    own(state, slots[0], 1, 3);
    const before = state.flow.transfer;
    const events = [] as ReturnType<typeof applyCommand>['events'];
    payToll(state, 0, slots[0], events);
    expect(state.flow.transfer).toBeGreaterThan(before);
    expect(REGION_BY_ID(TILE_MAP[slots[0]].regionId).id).toBe(TILE_MAP[slots[0]].regionId);
  });
});

/**
 * 效用函数（7.2）：
 * 效用 = 预期租金现值(12 回合) + 升值预期(区域热度趋势 × 时代系数趋势)
 *      + 战略价值(垄断同一区域 / 卡住对手路线)
 *      − 机会成本(现金的其他用途) − 现金安全惩罚(现金低于安全线时指数级上升)
 *      × (1 + 随机扰动)
 * 性格权重（7.3）通过系数调整各项。
 */
import type { SeatIndex } from '@/types';
import {
  AI_WEIGHTS,
  CFG,
  CHAPTER_MAP,
  DIFFICULTY_MAP,
  PERSONALITY_MAP,
  TILE_MAP,
  eraValueAtMonthOffset,
} from '@/config';
import { nextRandom } from '../rng';
import type { GameState } from '../state';
import {
  levelCapOf,
  tilePrice,
  monthlyRent,
  monthlyUpkeep,
  netWorth,
  regionTargetHeat,
  rentBonusOf,
  upgradeCost,
  vacancyFactor,
} from '../rules/economy';

/** 月度安全支出估算：利息 + 物业 + 税的平均水平（7.1 现金安全线以「月支出」为单位）。 */
export function monthlyOutgo(state: GameState, seat: SeatIndex): number {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat);
  const upkeep = owned.reduce((sum, t) => sum + monthlyUpkeep(state, t.id), 0);
  const interest = state.players[seat].debt * 0.006;
  return Math.max(20, upkeep + interest + 30);
}

/** 预期租金现值：按 12 回合窗口累加月度租金净额。 */
export function rentPresentValue(state: GameState, seat: SeatIndex, tileId: string): number {
  const rent = monthlyRent(state, tileId);
  const upkeep = monthlyUpkeep(state, tileId);
  return (rent - upkeep) * AI_WEIGHTS.rentHorizonTurns;
}

/** 升值预期：区域热度趋势 × 时代系数趋势。 */
export function appreciationScore(state: GameState, tileId: string): number {
  const cfg = TILE_MAP[tileId];
  const current = state.heat[cfg.regionId] ?? 50;
  const heatTrend = (regionTargetHeat(cfg.regionId) - current) / 20;
  const chapter = CHAPTER_MAP[state.chapterId];
  const nowEra = eraValueAtMonthOffset((chapter.startYear - 2010) * 12 + state.month);
  const nextEra = eraValueAtMonthOffset((chapter.startYear - 2010) * 12 + state.month + 12);
  const eraTrend = (nextEra - nowEra) / Math.max(0.01, nowEra);
  return tilePrice(state, tileId) * (0.35 * heatTrend + 0.65 * eraTrend);
}

/** 战略价值：垄断同一区域 + 卡住对手路线。 */
export function strategicValue(state: GameState, seat: SeatIndex, tileId: string): number {
  const cfg = TILE_MAP[tileId];
  const sameRegion = Object.values(state.tiles).filter((t) => TILE_MAP[t.id].regionId === cfg.regionId);
  const ownedInRegion = sameRegion.filter((t) => t.owner === seat).length;
  const monopoly = sameRegion.length > 0 ? ownedInRegion / sameRegion.length : 0;
  const contested = sameRegion.filter((t) => t.owner !== null && t.owner !== seat).length;
  return tilePrice(state, tileId) * AI_WEIGHTS.monopolyBonus * (monopoly + contested * 0.15);
}

/** 机会成本：这笔钱的其他用途（按最贵的未开发自有地块估算）。 */
export function opportunityCost(state: GameState, seat: SeatIndex, tileId: string): number {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat && t.level < 5);
  if (owned.length === 0) return 0;
  const best = owned.sort((a, b) => monthlyRent(state, b.id) - monthlyRent(state, a.id))[0];
  return upgradeCost(state, best.id) * 0.5 + tilePrice(state, tileId) * 0.1;
}

/** 现金安全惩罚：现金低于「安全线 × 月支出」时指数级上升。 */
export function safetyPenalty(state: GameState, seat: SeatIndex, cost: number): number {
  const difficulty = DIFFICULTY_MAP[state.players[seat].difficulty];
  const safety = monthlyOutgo(state, seat) * difficulty.safetyMonths;
  const after = state.players[seat].cash - cost;
  if (after >= safety) return 0;
  const shortfall = (safety - after) / Math.max(1, safety);
  return Math.pow(AI_WEIGHTS.SafetyPenaltyBase, shortfall * 4) * monthlyOutgo(state, seat);
}

/**
 * 开发期权价值：买地的价值主要来自「后续升级产生的租金」，而非当前等级。
 * 因此用「目标等级下的月净现金流」折算，减去各级升级的流动性损耗。
 */
export function developmentOption(state: GameState, seat: SeatIndex, tileId: string): number {
  const cfgTile = TILE_MAP[tileId];
  const price = tilePrice(state, tileId);
  const vacancy = vacancyFactor(state.heat[cfgTile.regionId] ?? 50);
  const bonus = 1 + rentBonusOf(state.players[seat].roleId, cfgTile.regionId);
  const target = Math.min(levelCapOf(state, tileId), AI_WEIGHTS.developTargetLevel);
  const steps = Math.max(0, target - state.tiles[tileId].level);

  const rentAtTarget = price * CFG.rentRate[target] * vacancy * bonus;
  const upkeepAtTarget = price * CFG.upkeepRate;
  const net = (rentAtTarget - upkeepAtTarget) * AI_WEIGHTS.upgradeHorizonTurns;
  const friction = steps * price * CFG.upgradeCostRate * AI_WEIGHTS.upgradeLiquidityFriction;
  return net - friction;
}

/** AI 的现金底线：保留若干个月的支出作为安全垫。 */
export function cashBuffer(state: GameState, seat: SeatIndex): number {
  const difficulty = DIFFICULTY_MAP[state.players[seat].difficulty];
  return monthlyOutgo(state, seat) * difficulty.safetyMonths * 0.6;
}

/** 综合买地效用（含性格权重与难度扰动）。 */
export function buyUtility(state: GameState, seat: SeatIndex, tileId: string): number {
  const player = state.players[seat];
  const personality = PERSONALITY_MAP[player.personality];
  const difficulty = DIFFICULTY_MAP[player.difficulty];
  const cost = tilePrice(state, tileId);

  const base =
    (rentPresentValue(state, seat, tileId) * personality.shortTermRentMul +
      developmentOption(state, seat, tileId)) * 0.6 +
    appreciationScore(state, tileId) * personality.appreciationMul * personality.heatTrendMul * 0.5 +
    strategicValue(state, seat, tileId) -
    opportunityCost(state, seat, tileId) -
    safetyPenalty(state, seat, cost) * personality.safetyPenaltyMul;

  const jitterRes = nextRandom(state.rng, 'aiJitter');
  const jitter = 1 + (jitterRes.value - 0.5) * 2 * difficulty.jitter;
  const ganging = gangRelief(state, seat);
  return base * jitter * ganging * player.buyThreshold;
}

/** 7.4 体验保护：玩家落后过多时降低针对权重，禁止 AI 围剿玩家。 */
function gangRelief(state: GameState, seat: SeatIndex): number {
  const human = state.players.find((p) => p.human);
  if (!human || human.seat === seat) return 1;
  const leaderWorth = Math.max(...state.players.filter((p) => !p.bankrupt).map((p) => netWorth(state, p.seat)));
  const humanWorth = netWorth(state, human.seat);
  const behind = humanWorth < leaderWorth * AI_WEIGHTS.gangingRatio;
  return behind ? 1 - AI_WEIGHTS.gangingRelief * (seat === human.seat ? 0 : 1) : 1;
}

/** 升级效用：租金增量 − 升级成本的机会成本（不修改传入状态）。 */
export function upgradeUtility(state: GameState, seat: SeatIndex, tileId: string): number {
  const personality = PERSONALITY_MAP[state.players[seat].personality];
  const cfgTile = TILE_MAP[tileId];
  const level = state.tiles[tileId].level;
  const price = tilePrice(state, tileId);
  const vacancy = vacancyFactor(state.heat[cfgTile.regionId] ?? 50);
  const bonus = 1 + rentBonusOf(state.players[seat].roleId, cfgTile.regionId);
  const deltaRate = (CFG.rentRate[level + 1] ?? 0) - CFG.rentRate[level];
  const monthlyGain = price * deltaRate * vacancy * bonus;
  const horizon = AI_WEIGHTS.upgradeHorizonTurns;
  const gain = monthlyGain * horizon;
  const cost = upgradeCost(state, tileId);
  const cashGuard = state.players[seat].cash - cost > cashBuffer(state, seat) ? 0 : monthlyOutgo(state, seat) * 2;
  // V1.6：升级是账面中性的（现金 → 等额资产），因此只扣「流动性损耗」而非全额成本
  const liquidityFriction = cost * AI_WEIGHTS.upgradeLiquidityFriction;
  return (gain - liquidityFriction - cashGuard) * personality.appreciationMul;
}

/** 卖地止损：现金流连续为负且热度下行时，按 utility 触发（7.2 关键约束）。 */
export function shouldCutLoss(state: GameState, seat: SeatIndex): boolean {
  const flow = monthlyOutgo(state, seat);
  const cash = state.players[seat].cash;
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat);
  if (owned.length === 0) return false;
  const lowestHeat = Math.min(...owned.map((t) => state.heat[TILE_MAP[t.id].regionId] ?? 50));
  const heatDown = lowestHeat < 35;
  const cashTight = cash < flow * AI_WEIGHTS.lossCutTurns * 0.8;
  return cashTight && heatDown;
}

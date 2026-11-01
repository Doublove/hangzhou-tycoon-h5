/**
 * 经济核心换算：地价 / 租金 / 空置率 / 升级 / 贷款 / 税 / 净资产。
 * 所有系数取自 src/config（唯一真源），本文件只做换算。
 */
import type { SeatIndex, TileLevel } from '@/types';
import { CFG, CHAPTER_MAP, REGION_BY_ID, ROLE_MAP, TILE_MAP, eraValueAtMonthOffset } from '@/config';
import { activePolicyIds, type GameState } from '../state';

/**
 * 地块的当前地价（游戏口径）：基准价 × 时代系数 × 热度系数 × 结构性溢价。
 * 买价、租金基数、升级费、估值与过路费一律以它为准，
 * 因此「时代」与「热度」才能真正改写资产，而不是只改显示值。
 */
/** 地块的有效等级上限（含事件带来的临时加成）。 */
export function levelCapOf(state: GameState, tileId: string): TileLevel {
  const cfg = TILE_MAP[tileId];
  const st = state.tiles[tileId];
  const capped = Math.min(5, cfg.levelCap + st.levelCapBoost);
  return capped as TileLevel;
}

/** 地块的当前地价：基准价 × 时代系数 × 热度系数 × 结构性溢价。 */
export function tilePrice(state: GameState, tileId: string): number {
  const cfg = TILE_MAP[tileId];
  const st = state.tiles[tileId];
  const chapter = CHAPTER_MAP[state.chapterId];
  const era = eraValueAtMonthOffset((chapter.startYear - 2010) * 12 + state.month);
  const heat = state.heat[cfg.regionId] ?? 50;
  const heatFactor = 0.6 + heat / 125;
  const base = cfg.price * (1 + st.priceBoost);
  return base * era * heatFactor;
}

/** 地块的基准价（不含热度与时代浮动），仅用于附录 A 的对账与 debug 输出。 */
export function basePrice(state: GameState, tileId: string): number {
  const cfg = TILE_MAP[tileId];
  const st = state.tiles[tileId];
  return cfg.price * (1 + st.priceBoost);
}

/** 空置率系数：热度 ≥40 → 100%；25—40 → 50%；<25 → 25%（A8）。 */
export function vacancyFactor(heat: number): number {
  if (heat >= CFG.vacancyFullHeat) return CFG.vacancyFull;
  if (heat >= CFG.vacancyHalfHeat) return CFG.vacancyHalf;
  return CFG.vacancyLow;
}

/**
 * 月租金：地价 × 等级租金率 × 空置率。
 * 8.7：月租金属于「系统注入」，计入资金流向统计。
 */
export function monthlyRent(state: GameState, tileId: string): number {
  const st = state.tiles[tileId];
  if (st.owner === null) return 0;
  const cfg = TILE_MAP[tileId];
  const price = tilePrice(state, tileId);
  const rate = CFG.rentRate[st.level] ?? 0;
  const factor = vacancyFactor(state.heat[cfg.regionId] ?? 50);
  const role = state.players[st.owner];
  const bonus = rentBonusOf(role.roleId, cfg.regionId);
  return price * rate * factor * (1 + bonus);
}

/** 角色被动：指定区域的租金加成比例（6.2）。 */
export function rentBonusOf(roleId: string, regionId: string): number {
  const passive = ROLE_MAP[roleId]?.passive;
  if (!passive?.rentBonusRegions || !passive.rentBonusMul) return 0;
  return passive.rentBonusRegions.includes(regionId) ? passive.rentBonusMul - 1 : 0;
}

/** 物业费：地价 × 0.15%/月，空地减半（8.2）。 */
export function monthlyUpkeep(state: GameState, tileId: string): number {
  const st = state.tiles[tileId];
  const price = tilePrice(state, tileId);
  const base = price * CFG.upkeepRate;
  return st.level === 0 ? base * CFG.upkeepVacantMul : base;
}

/** 升级费用：地价 × 30%（A7 与估值系数对齐）。 */
export function upgradeCost(state: GameState, tileId: string): number {
  return tilePrice(state, tileId) * CFG.upgradeCostRate;
}

/** 卖出回笼：地价 × 80%，再扣手续费与政策折价。 */
export function sellProceeds(state: GameState, tileId: string, seller: SeatIndex): number {
  const price = tilePrice(state, tileId);
  const st = state.tiles[tileId];
  const policies = activePolicyIds(state);
  let proceeds = price * CFG.sellbackRate;
  if (policies.includes('xianShou')) proceeds *= 1 - 0.2;
  if (policies.includes('xianJia')) proceeds *= 1 - 0.35;
  const role = state.players[seller];
  const feeMul = role.roleId === 'wangzhongjie' ? 0.5 : 1;
  const fee = price * CFG.tradeFeeRate * feeMul;
  return Math.max(0, proceeds - fee);
}

/** 估值：地价 × (1 + 30% × 等级)，用于净资产。 */
export function tileValue(state: GameState, tileId: string): number {
  const st = state.tiles[tileId];
  return tilePrice(state, tileId) * (1 + CFG.networthLevelRate * st.level);
}

/** 证券市值按初始价与时代系数估算（V1.8 证券格）。 */
export function securitiesValue(state: GameState, seat: SeatIndex): number {
  const p = state.players[seat];
  const chapter = CHAPTER_MAP[state.chapterId];
  const era = eraValueAtMonthOffset((chapter.startYear - 2010) * 12 + state.month);
  return p.securitiesLots * CFG.securitiesInitialPrice * era;
}

/** 净资产 = 现金 + Σ 地价 ×(1 + 30%×等级) + 股票 − 负债（A13）。 */
export function netWorth(state: GameState, seat: SeatIndex): number {
  const p = state.players[seat];
  const owned = Object.values(state.tiles)
    .filter((t) => t.owner === seat)
    .reduce((sum, t) => sum + tileValue(state, t.id), 0);
  return p.cash + owned + securitiesValue(state, seat) - p.debt;
}

/** 杠杆率 = 负债 ÷ 净资产（8.4）。 */
export function leverageOf(state: GameState, seat: SeatIndex): number {
  const p = state.players[seat];
  const nw = netWorth(state, seat);
  if (nw <= 0) return p.debt > 0 ? Number.POSITIVE_INFINITY : 0;
  return p.debt / nw;
}

/** 贷款月利率：0.6%；限贷期 0.75%；杠杆 >50% 上浮 50%。 */
export function loanRateOf(state: GameState, seat: SeatIndex): number {
  const policies = activePolicyIds(state);
  const restricted = policies.includes('xianDai');
  const base = restricted ? CFG.loanRateRestriction : CFG.loanRate;
  const leveraged = leverageOf(state, seat) > CFG.leverageNoCap;
  const roleMul = state.players[seat].roleId === 'wenlaoban' ? 0.8 : 1;
  return base * (leveraged ? CFG.loanRatePenaltyMul : 1) * roleMul;
}

/** 贷款额度上限：净资产 × 60%（限贷期 40%），角色倍率另计。 */
export function loanLimitOf(state: GameState, seat: SeatIndex): number {
  const policies = activePolicyIds(state);
  const restricted = policies.includes('xianDai');
  const ratio = restricted ? CFG.loanLimitRestriction : CFG.loanLimitRatio;
  const roleMul = state.players[seat].roleId === 'wenlaoban' ? 1.3 : 1;
  const remaining = Math.max(0, netWorth(state, seat) * ratio * roleMul - state.players[seat].debt);
  return Math.min(remaining, CFG.loanSingleCap);
}

/** 月利息支出。 */
export function monthlyInterest(state: GameState, seat: SeatIndex): number {
  return state.players[seat].debt * loanRateOf(state, seat);
}

/** 累进房产税：持有 ≥4 套起，每超出一套按净资产 1.2% 征收（V1.6 定稿口径）。 */
export function monthlyTax(state: GameState, seat: SeatIndex): number {
  const count = Object.values(state.tiles).filter((t) => t.owner === seat).length;
  if (count < CFG.taxMinTiles) return 0;
  const tiers = count - (CFG.taxMinTiles - 1);
  return Math.max(0, netWorth(state, seat) * CFG.taxRatePerTile * tiers);
}

/** 区域是否处于政策冻结状态（5.4 冻结政策）。 */
export function regionFrozen(state: GameState, regionId: string): boolean {
  return activePolicyIds(state).includes('dongJie') && state.frozenRegion === regionId;
}

/** 月度收支明细，用于财报面板与现金流连线（8.3）。 */
export interface MonthlyFlow {
  rentIncome: number;
  interest: number;
  upkeep: number;
  tax: number;
  net: number;
}

export function monthlyFlow(state: GameState, seat: SeatIndex): MonthlyFlow {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat);
  const rentIncome = owned.reduce((sum, t) => sum + monthlyRent(state, t.id), 0);
  const upkeep = owned.reduce((sum, t) => sum + monthlyUpkeep(state, t.id), 0);
  const interest = monthlyInterest(state, seat);
  const tax = monthlyTax(state, seat);
  return {
    rentIncome,
    interest,
    upkeep,
    tax,
    net: rentIncome - interest - upkeep - tax,
  };
}

/** 区域的回归目标热度（3.6 月度自然回归）。 */
export function regionTargetHeat(regionId: string): number {
  return REGION_BY_ID(regionId).targetHeat;
}

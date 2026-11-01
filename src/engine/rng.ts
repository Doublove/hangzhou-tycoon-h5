/**
 * 确定性随机（A17：同一 seed 两次运行，逐回合状态哈希一致）。
 *
 * 设计要点：
 *  1. 单一 master seed 派生多条用途独立的随机流（分用途隔离），
 *     避免「改了抽卡逻辑导致掷骰序列变化」这种跨用途耦合；
 *  2. 所有随机必须经由本文件的函数产生，禁止 Math.random；
 *  3. RngState 为纯数据（可序列化），随存档一起持久化。
 */

/** 随机用途：每种用途一条独立的流。 */
export type RngPurpose =
  | 'dice'
  | 'card'
  | 'item'
  | 'aiJitter'
  | 'heat'
  | 'negativeRegion'
  | 'broker';

export interface RngState {
  seed: number;
  streams: Record<RngPurpose, number>;
}

const PURPOSES: RngPurpose[] = ['dice', 'card', 'item', 'aiJitter', 'heat', 'negativeRegion', 'broker'];

/** 创建初始随机状态：由 master seed 派生各用途的起始值。 */
export function createRng(seed: number): RngState {
  const streams = {} as Record<RngPurpose, number>;
  let mixed = seed >>> 0;
  PURPOSES.forEach((p, i) => {
    mixed = (mixed + 0x6d2b79f5 * (i + 1)) >>> 0;
    let x = mixed;
    x = Math.imul(x ^ (x >>> 15), 1 | x);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    streams[p] = (x ^ (x >>> 14)) >>> 0;
  });
  return { seed: seed >>> 0, streams };
}

/** mulberry32：返回一个新流值与 [0,1) 随机数。 */
function next(seed: number): { seed: number; value: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { seed: t, value };
}

/** 取一个 [0,1) 随机数并推进指定用途的流。 */
export function nextRandom(rng: RngState, purpose: RngPurpose): { rng: RngState; value: number } {
  const current = rng.streams[purpose] ?? rng.seed;
  const res = next(current);
  return {
    rng: { seed: rng.seed, streams: { ...rng.streams, [purpose]: res.seed } },
    value: res.value,
  };
}

/** 取 [min,max] 闭区间内的整数。 */
export function nextInt(rng: RngState, purpose: RngPurpose, min: number, max: number): { rng: RngState; value: number } {
  const res = nextRandom(rng, purpose);
  const span = max - min + 1;
  return { rng: res.rng, value: min + Math.floor(res.value * span) };
}

/** 等概率抽一项。 */
export function pickOne<T>(rng: RngState, purpose: RngPurpose, list: readonly T[]): { rng: RngState; value: T } {
  if (list.length === 0) {
    console.error('[rng] 空列表不可抽样');
    return { rng, value: undefined as unknown as T };
  }
  const res = nextInt(rng, purpose, 0, list.length - 1);
  return { rng: res.rng, value: list[res.value] };
}

/** 按权重抽一项。 */
export function weightedPick<T extends string>(
  rng: RngState,
  purpose: RngPurpose,
  weights: Record<T, number>,
): { rng: RngState; value: T } {
  const keys = Object.keys(weights) as T[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  if (total <= 0) {
    console.error('[rng] 权重和必须大于 0');
    return { rng, value: keys[0] };
  }
  const res = nextRandom(rng, purpose);
  let acc = 0;
  const target = res.value * total;
  for (const k of keys) {
    acc += weights[k];
    if (target < acc) return { rng: res.rng, value: k };
  }
  return { rng: res.rng, value: keys[keys.length - 1] };
}

/** Fisher–Yates 洗牌（不修改入参）。 */
export function shuffled<T>(rng: RngState, purpose: RngPurpose, list: readonly T[]): { rng: RngState; value: T[] } {
  const arr = [...list];
  let cursor = rng;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const res = nextInt(cursor, purpose, 0, i);
    cursor = res.rng;
    const j = res.value;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { rng: cursor, value: arr };
}

/** 概率判定。 */
export function chance(rng: RngState, purpose: RngPurpose, probability: number): { rng: RngState; value: boolean } {
  const res = nextRandom(rng, purpose);
  return { rng: res.rng, value: res.value < probability };
}

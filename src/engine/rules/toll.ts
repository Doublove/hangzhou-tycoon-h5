/**
 * 过路费与连片（3.5 / 3.6 / 8.7）。
 *
 * A5：相邻同主 ×2；左右都同主仍为 ×2（不叠乘）；跨起点不算相邻。
 * A6：单次支付 ≤ 支付方净资产 25%；杠杆 > 50% 时取消封顶保护。
 */
import type { SeatIndex } from '@/types';
import { CFG, BOARD_LAYOUT, adjacentSlots, slotIndexOf } from '@/config';
import type { GameState } from '../state';
import { tilePrice, leverageOf, netWorth } from './economy';

/** 某宗地块与其相邻槽位是否构成连片（同主）。 */
export function isAdjacent(state: GameState, tileId: string): boolean {
  const st = state.tiles[tileId];
  if (st.owner === null) return false;
  const cell = state.cells.find((c) => c.tileId === tileId);
  if (!cell) return false;
  const slot = slotIndexOf(cell.index);
  if (slot < 0) return false;
  return adjacentSlots(slot, BOARD_LAYOUT.tileSlots.length).some((neighborSlot) => {
    const neighborIndex = BOARD_LAYOUT.tileSlots[neighborSlot];
    const neighborTileId = state.cells[neighborIndex]?.tileId;
    return Boolean(neighborTileId) && state.tiles[neighborTileId!]?.owner === st.owner;
  });
}

/** 基础过路费：地价 × 等级费率。 */
export function baseToll(state: GameState, tileId: string): number {
  const st = state.tiles[tileId];
  const rate = CFG.tollRate[st.level] ?? 0;
  return tilePrice(state, tileId) * rate;
}

export interface TollResult {
  amount: number;
  adjacency: boolean;
  capped: boolean;
  raw: number;
}

/** 完整过路费计算：连片加成 + 单次上限保护。 */
export function computeToll(state: GameState, tileId: string, payer: SeatIndex): TollResult {
  const raw = baseToll(state, tileId);
  const adjacency = isAdjacent(state, tileId);
  const multiplied = raw * (adjacency ? CFG.adjacencyMultiplier : 1);
  const payerNet = netWorth(state, payer);
  const protectionLost = leverageOf(state, payer) > CFG.leverageNoCap;
  const cap = Math.max(0, payerNet * CFG.tollCapRatio);
  const capped = !protectionLost && multiplied > cap && cap > 0;
  const amount = capped ? cap : multiplied;
  return { amount, adjacency, capped, raw: multiplied };
}

/** 给 UI 用的连片提示文案。 */
export function adjacencyTooltip(state: GameState, tileId: string): string {
  return isAdjacent(state, tileId) ? '连片 ×2' : '';
}

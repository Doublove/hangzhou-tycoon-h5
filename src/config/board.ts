/**
 * 棋盘格位表 —— V2.0 方环方案（3.7「V2.0 的棋盘重构」）。
 *
 * 裁决说明（详见 docs/decision-log.md）：
 *  - 采用 7×7 方环，外框一圈共 24 格 = 起点 1 + 地块 16 + 功能格 7；
 *  - 监狱移到棋盘中心，不再占用环上格子（功能格由 9 个减为 7 个）；
 *  - 0 号格（起点）位于顶边中点，顺时针编号；
 *  - 附录 C / A2 / A3 / 2.1 / 9.4 仍写「26 格 / 功能格 9」，属未同步的残留，由本表为准。
 *
 * 几何：7×7 周长恰为 4×7−4 = 24 格。
 * 顶边自中点向右 4 格（含右上角）、右边 6 格（含右下角）、
 * 底边 6 格（含左下角）、左边 5 格、顶边左半 3 格，合计 24。
 */
import type { BoardCell, CellKind } from '@/types';

/** 棋盘边长（7×7）。 */
export const BOARD_SIDE = 7;

/** 一圈的格数（A2 验收口径：格位表长度恒为 24）。 */
export const RING_CELLS = 24;

/** 功能格数量（A2 验收口径：恒为 7）。 */
export const FUNCTION_CELLS = 7;

/** 起点序号。 */
export const START_CELL = 0;

/** 棋盘中心坐标（监狱所在处，不占环上格子）。 */
export const JAIL_POINT = { row: 3, col: 3 };

/** 7×7 周长按顺时针展开的行列坐标表。 */
const PERIMETER: ReadonlyArray<readonly [number, number]> = (() => {
  const cells: Array<readonly [number, number]> = [];
  const n = BOARD_SIDE;
  // 顶边：自中点（第 3 列）向右到右上角
  for (let col = 3; col < n; col += 1) cells.push([0, col] as const);
  // 右边：行 1 → 6
  for (let row = 1; row < n; row += 1) cells.push([row, n - 1] as const);
  // 底边：列 5 → 0
  for (let col = n - 2; col >= 0; col -= 1) cells.push([n - 1, col] as const);
  // 左边：行 5 → 1
  for (let row = n - 2; row >= 1; row -= 1) cells.push([row, 0] as const);
  // 顶边左半：列 0 → 2
  for (let col = 0; col < 3; col += 1) cells.push([0, col] as const);
  return cells;
})();

/** 角格序号：右上 3、右下 9、左下 15、左上 21。 */
const CORNER_INDICES = [3, 9, 15, 21];

/** 四角固定功能格（V2.0）：右上机会、右下风景区、左下道具店、左上机会。 */
const CORNER_KINDS: CellKind[] = ['chance', 'scenic', 'shop', 'chance'];

/** 其余三个功能格的位置：命运 7、银行 12、证券 17。 */
const FUNCTION_SLOTS: Record<number, CellKind> = {
  7: 'destiny',
  12: 'bank',
  17: 'securities',
};

export interface RingBlueprint {
  cells: BoardCell[];
  /** 地块格序号的有序列表（16 个），用于在环上按序安放某章的 16 宗地块。 */
  tileSlots: number[];
}

/** 生成方环蓝图；地块槽位留占位 id，运行时由章节的地块列表按序绑定。 */
export function buildRingBlueprint(): RingBlueprint {
  const cells: BoardCell[] = [];
  const tileSlots: number[] = [];
  let tileCursor = 0;

  for (let index = 0; index < RING_CELLS; index += 1) {
    const [row, col] = PERIMETER[index];
    const corner = CORNER_INDICES.includes(index);
    let kind: CellKind;
    let tileId: string | null = null;

    if (index === START_CELL) {
      kind = 'start';
    } else if (corner) {
      kind = CORNER_KINDS[CORNER_INDICES.indexOf(index)];
    } else if (FUNCTION_SLOTS[index]) {
      kind = FUNCTION_SLOTS[index];
    } else {
      kind = 'tile';
      tileSlots.push(index);
      tileId = `slot-${tileCursor}`;
      tileCursor += 1;
    }
    cells.push({ index, kind, tileId, row, col, corner });
  }

  return { cells, tileSlots };
}

/**
 * 把某章的 16 宗地块按顺序绑定到方环上的 16 个地块槽位，
 * 得到一份可直接使用的格位表（Canvas 布局与逻辑判定共用）。
 */
export function bindTilesToRing(tileIds: string[]): BoardCell[] {
  if (tileIds.length !== 16) {
    console.error(`[config] 每环应为 16 宗地块，实际传入 ${tileIds.length} 宗`);
    return BOARD_LAYOUT.cells;
  }
  return BOARD_LAYOUT.cells.map((cell) => {
    if (cell.kind !== 'tile') return cell;
    const slot = BOARD_LAYOUT.tileSlots.indexOf(cell.index);
    return { ...cell, tileId: tileIds[slot] };
  });
}

/** 取指定格位；越界时打印错误并回退到起点。 */
export function cellAt(cells: BoardCell[], index: number): BoardCell {
  const found = cells[index];
  if (!found) {
    console.error(`[config] 格位序号越界：${index}`);
    return cells[START_CELL];
  }
  return found;
}

/** 该格位在「地块槽位序列」中的下标；非地块格返回 -1。 */
export function slotIndexOf(index: number): number {
  return BOARD_LAYOUT.tileSlots.indexOf(index);
}

/** 按格位序号反查其所属的功能格类型（含起点）。 */
export function cellKindOf(index: number): CellKind {
  return BOARD_LAYOUT.cells[index]?.kind ?? 'start';
}

/**
 * 相邻判定（连片）：以「环上的地块槽位顺序」为准。
 * 左右两块地若同主则构成连片 ×2；不叠乘（左中右三块同主仍为 ×2）；
 * 跨起点不算连片（槽位序列的首尾不相邻）。
 */
export function adjacentSlots(slotIndex: number, totalSlots: number): number[] {
  if (totalSlots <= 1) return [];
  const prev = slotIndex - 1;
  const next = slotIndex + 1;
  const result: number[] = [];
  if (prev >= 0) result.push(prev);
  if (next <= totalSlots - 1) result.push(next);
  return result;
}

/** 带环绕的行进指引（含起点）。 */
export function advance(from: number, steps: number, direction = 1): number {
  const n = RING_CELLS;
  return ((from + direction * steps) % n + n) % n;
}

/**
 * 判断是否「经过」起点（用于月供结算，正反向都算，V1.5）。
 * 停在起点不触发，因此必须是严格越过（A11）。
 */
export function crossedStart(from: number, steps: number, direction = 1): boolean {
  if (steps <= 0) return false;
  if (direction === 1) {
    return from + steps > RING_CELLS;
  }
  return steps > from;
}

export const BOARD_LAYOUT = buildRingBlueprint();

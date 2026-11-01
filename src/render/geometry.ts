/**
 * 方环几何（V2.0 / D-01）：7×7 周长 24 格，外圈留出「房产位」窄带。
 *
 * 房产位（V2.0）：方环外侧一圈常驻的黑框位，与所属地块同列同排对齐；
 * 未挂牌变暗、空地只显示紫色虚线框、买入后框内按 Lv1—Lv5 画立面、烂尾整框转红。
 */
import type { BoardCell } from '@/types';
import { BOARD_SIDE } from '@/config';

export interface CellRect {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 房产位（外侧窄带）矩形。 */
  slot: { x: number; y: number; w: number; h: number };
  corner: boolean;
}

export interface BoardLayout {
  size: number;
  cell: number;
  cells: CellRect[];
  /** 棋盘中心（监狱所在处，不占环上格子）。 */
  jail: { x: number; y: number; w: number; h: number };
  /** 环内侧的连片连接带半径参考值。 */
  innerPadding: number;
}

/** 计算某个格位朝向环外的方向向量。 */
function outward(row: number, col: number): { dx: number; dy: number } {
  const last = BOARD_SIDE - 1;
  if (row === 0) return { dx: 0, dy: -1 };
  if (row === last) return { dx: 0, dy: 1 };
  if (col === 0) return { dx: -1, dy: 0 };
  if (col === last) return { dx: 1, dy: 0 };
  return { dx: 0, dy: -1 };
}

/**
 * 由棋盘像素尺寸生成布局。
 * 房产位宽度取格宽的 0.62，与格子同列同排对齐，外扩距离为格宽的 0.34。
 */
export function computeLayout(cells: BoardCell[], size: number): BoardLayout {
  const cell = size / BOARD_SIDE;
  const inner = cell * 0.08;

  const rects: CellRect[] = cells.map((c) => {
    const x = c.col * cell + inner;
    const y = c.row * cell + inner;
    const w = cell - inner * 2;
    const h = cell - inner * 2;
    const { dx, dy } = outward(c.row, c.col);
    const slotDepth = cell * 0.42;
    const slotW = dx === 0 ? w * 0.62 : slotDepth * 0.8;
    const slotH = dy === 0 ? h * 0.62 : slotDepth * 0.8;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const offset = cell * 0.34;
    return {
      index: c.index,
      row: c.row,
      col: c.col,
      x,
      y,
      w,
      h,
      slot: {
        x: cx - slotW / 2 + dx * (w / 2 + offset),
        y: cy - slotH / 2 + dy * (h / 2 + offset),
        w: slotW,
        h: slotH,
      },
      corner: c.corner,
    };
  });

  const jailSize = cell * 3;
  return {
    size,
    cell,
    cells: rects,
    jail: {
      x: size / 2 - jailSize / 2,
      y: size / 2 - jailSize / 2,
      w: jailSize,
      h: jailSize,
    },
    innerPadding: inner,
  };
}

/** 格位中心点（棋子落位用）。 */
export function cellCenter(layout: BoardLayout, index: number): { x: number; y: number } {
  const rect = layout.cells[index];
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** 缩放后的布局（0.8—1.6 倍只缩放不重排，9.1）。 */
export function scaleLayout(layout: BoardLayout, scale: number): BoardLayout {
  const s = Math.max(0.5, Math.min(2, scale));
  return {
    ...layout,
    size: layout.size * s,
    cell: layout.cell * s,
    cells: layout.cells.map((c) => ({
      ...c,
      x: c.x * s,
      y: c.y * s,
      w: c.w * s,
      h: c.h * s,
      slot: { x: c.slot.x * s, y: c.slot.y * s, w: c.slot.w * s, h: c.slot.h * s },
    })),
    jail: { ...layout.jail, x: layout.jail.x * s, y: layout.jail.y * s, w: layout.jail.w * s, h: layout.jail.h * s },
  };
}

/**
 * 方环棋盘画布渲染（Canvas 2D，不引入游戏引擎）。
 *
 * 分层策略：盘面（静态，尺寸/章节变化时重绘）+ 棋子与标记（每帧重绘）。
 * 底图为艺术化示意：木纹盘面 + 淡棋格 + 星位，不画行政边界与经纬度（13.1 合规）。
 */
import type { BoardCell } from '@/types';
import { computeLayout, type BoardLayout } from './geometry';
import { THEME, CELL_LABEL, fontScale, pieceSize } from './theme';
import { drawBuilding } from './buildings';
import { drawPiece, roundRect } from './pieces';
import type { BoardView, CellView } from './board-view';

export interface DrawOptions {
  /** 是否绘制调试格号。 */
  debug?: boolean;
  /** 高亮的格位（当前落点）。 */
  highlight?: number | null;
}

/** 盘面层：只与棋盘尺寸相关，可缓存到离屏画布。 */
export function drawBoardFace(
  ctx: CanvasRenderingContext2D,
  cells: BoardCell[],
  layout: BoardLayout,
): void {
  const { size } = layout;
  ctx.save();
  // 木纹盘面
  ctx.fillStyle = THEME.boardFace;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = THEME.boardFaceAlt;
  ctx.fillRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);

  // 淡棋格
  ctx.strokeStyle = THEME.gridLine;
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i += 1) {
    const p = (size / 7) * i;
    ctx.beginPath();
    ctx.moveTo(p, size * 0.06);
    ctx.lineTo(p, size * 0.94);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.06, p);
    ctx.lineTo(size * 0.94, p);
    ctx.stroke();
  }

  // 星位（艺术化示意，非地理坐标）
  ctx.fillStyle = THEME.starPoint;
  [
    [2, 2],
    [2, 4],
    [4, 2],
    [4, 4],
    [3, 3],
  ].forEach(([r, c]) => {
    ctx.beginPath();
    ctx.arc((size / 7) * (c + 0.5), (size / 7) * (r + 0.5), Math.max(2, size * 0.006), 0, Math.PI * 2);
    ctx.fill();
  });

  // 监狱（棋盘中心，V2.0 / D-04）
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  roundRect(ctx, layout.jail.x, layout.jail.y, layout.jail.w, layout.jail.h, size * 0.02);
  ctx.stroke();
  ctx.fillStyle = THEME.textDim;
  ctx.font = `${fontScale(size) * 0.9}px "PingFang SC", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('看守所', layout.jail.x + layout.jail.w / 2, layout.jail.y + layout.jail.h * 0.24);
  ctx.restore();
  void cells;
}

/** 格位层：地块（围棋子浅色石）与功能格（墨色石 + 深色底白字）。 */
export function drawCells(
  ctx: CanvasRenderingContext2D,
  view: BoardView,
  layout: BoardLayout,
  options: DrawOptions = {},
): void {
  const fs = fontScale(layout.size);
  view.cells.forEach((cell) => {
    const rect = layout.cells[cell.index];
    if (!rect) return;
    drawCell(ctx, cell, rect, fs, options.highlight === cell.index);
    drawPropertySlot(ctx, cell, rect);
    if (options.debug) {
      ctx.fillStyle = THEME.textDim;
      ctx.font = `${fs * 0.7}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(String(cell.index), rect.x + 2, rect.y + fs * 0.8);
    }
  });
  drawAdjacencyBands(ctx, view, layout);
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: CellView,
  rect: { x: number; y: number; w: number; h: number },
  fs: number,
  highlighted: boolean,
): void {
  const isTile = cell.kind === 'tile';
  ctx.save();
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = isTile ? THEME.stoneLight : THEME.stoneDark;
  ctx.fill();
  ctx.lineWidth = highlighted ? 3 : 1.5;
  ctx.strokeStyle = highlighted ? THEME.gold : THEME.stoneEdge;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isTile) {
    ctx.fillStyle = cell.unlocked ? THEME.panel : THEME.textDim;
    ctx.font = `${fs * 0.86}px "PingFang SC", system-ui, sans-serif`;
    ctx.fillText(cell.name, rect.x + rect.w / 2, rect.y + rect.h * 0.42);
    // 等级点
    const dotR = Math.max(1.6, rect.w * 0.035);
    for (let i = 0; i < 5; i += 1) {
      const dx = rect.x + rect.w * (0.28 + i * 0.11);
      ctx.beginPath();
      ctx.arc(dx, rect.y + rect.h * 0.7, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < cell.level ? (cell.owner !== null ? cellColor(cell.owner) : THEME.gold) : 'rgba(0,0,0,0.18)';
      ctx.fill();
    }
    if (!cell.unlocked) {
      ctx.fillStyle = THEME.textDim;
      ctx.font = `${fs * 0.62}px "PingFang SC", system-ui, sans-serif`;
      ctx.fillText('未挂牌', rect.x + rect.w / 2, rect.y + rect.h * 0.84);
    }
  } else {
    // 功能格：深色底白字（9.4）
    ctx.fillStyle = cell.kind === 'start' ? THEME.gold : THEME.text;
    ctx.font = `600 ${fs * (cell.kind === 'start' ? 1.05 : 0.78)}px "PingFang SC", system-ui, sans-serif`;
    ctx.fillText(CELL_LABEL[cell.kind] ?? '', rect.x + rect.w / 2, rect.y + rect.h * 0.5);
  }
  ctx.restore();
}

function cellColor(seat: number): string {
  return THEME.seatColors[seat % THEME.seatColors.length];
}

/** 房产位：未挂牌变暗、空地紫色虚线框、买入后画立面、烂尾整框转红（V2.0）。 */
function drawPropertySlot(
  ctx: CanvasRenderingContext2D,
  cell: CellView,
  rect: { slot: { x: number; y: number; w: number; h: number } },
): void {
  if (cell.kind !== 'tile') return;
  const slot = rect.slot;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

  if (cell.stalled) {
    ctx.strokeStyle = THEME.loss;
    ctx.lineWidth = 2;
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
  } else if (!cell.unlocked) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
  } else if (cell.owner === null) {
    ctx.strokeStyle = THEME.purpleDash;
    ctx.setLineDash([Math.max(2, slot.w * 0.12), Math.max(2, slot.w * 0.08)]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = cellColor(cell.owner);
    ctx.lineWidth = 2;
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    drawBuilding(ctx, cell.level, slot.x, slot.y, slot.w, slot.h, cell.regionColor);
  }
  ctx.restore();
}

/** 连片连接带：画在环内侧，配合 ×2 标记（V1.4 几何结论）。 */
function drawAdjacencyBands(
  ctx: CanvasRenderingContext2D,
  view: BoardView,
  layout: BoardLayout,
): void {
  ctx.save();
  ctx.lineWidth = Math.max(2, layout.cell * 0.06);
  view.cells.forEach((cell) => {
    if (!cell.adjacency || cell.owner === null) return;
    const rect = layout.cells[cell.index];
    ctx.strokeStyle = cellColor(cell.owner);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = THEME.gold;
    ctx.font = `700 ${fontScale(layout.size) * 0.62}px "DIN Alternate", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×2', rect.x + rect.w * 0.86, rect.y + rect.h * 0.16);
  });
  ctx.restore();
}

/** 棋子层：每帧重绘（含当前回合的浮动椭圆投影）。 */
export function drawPieces(
  ctx: CanvasRenderingContext2D,
  view: BoardView,
  layout: BoardLayout,
  activeSeat: number,
): void {
  const size = pieceSize(layout.size);
  view.players.forEach((player) => {
    if (player.bankrupt) return;
    if (player.jailed) {
      // 监狱位于棋盘中心（V2.0）
      const { x, y, w, h } = layout.jail;
      drawShadow(ctx, x + w * (0.25 + 0.16 * player.seat), y + h * 0.8, w * 0.12, player.seat === activeSeat);
      drawPiece(ctx, player.piece, x + w * (0.25 + 0.16 * player.seat), y + h * 0.78, size * 0.8, player.color);
      return;
    }
    const rect = layout.cells[player.position];
    if (!rect) return;
    const spread = (player.seat - 1.5) * rect.w * 0.22;
    const cx = rect.x + rect.w / 2 + spread;
    const bottom = rect.y + rect.h * 0.94;
    drawShadow(ctx, cx, bottom, rect.w * 0.16, player.seat === activeSeat);
    drawPiece(ctx, player.piece, cx, bottom, size, player.color);
  });
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  radius: number,
  active: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, bottom + radius * 0.18, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = active ? 'rgba(224,163,68,0.55)' : 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.restore();
}

/** 一次性绘制整块棋盘（盘面 + 格位 + 棋子）。 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  cells: BoardCell[],
  view: BoardView,
  boardSize: number,
  activeSeat: number,
  options: DrawOptions = {},
): BoardLayout {
  const layout = computeLayout(cells, boardSize);
  drawBoardFace(ctx, cells, layout);
  drawCells(ctx, view, layout, options);
  drawPieces(ctx, view, layout, activeSeat);
  return layout;
}

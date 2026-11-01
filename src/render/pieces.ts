/**
 * 棋子：国际象棋造型（王 / 后 / 车 / 马），平涂 + 2px 深褐描边（#3A2E2A）。
 * 判据（9.4）：四个棋子转成纯黑剪影后仍能分辨——因此靠轮廓区分，不靠颜色。
 */
import { THEME } from './theme';

export type PieceKind = 'king' | 'queen' | 'rook' | 'knight';

/** 在 (cx, bottom) 处绘制一枚棋子，高度由 size 决定。 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  kind: PieceKind,
  cx: number,
  bottom: number,
  size: number,
  color: string,
  outline = THEME.stoneEdge,
): void {
  const w = size * 0.52;
  const h = size;
  const left = cx - w / 2;

  ctx.save();
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.strokeStyle = outline;
  ctx.fillStyle = color;

  // 通用底座
  const baseH = h * 0.22;
  roundRect(ctx, left, bottom - baseH, w, baseH, h * 0.05);
  ctx.fill();
  ctx.stroke();

  // 身体
  const bodyTop = bottom - baseH;
  ctx.beginPath();
  switch (kind) {
    case 'king': {
      // 王冠 + 十字
      ctx.moveTo(cx - w * 0.32, bodyTop);
      ctx.lineTo(cx - w * 0.26, bodyTop - h * 0.42);
      ctx.lineTo(cx - w * 0.12, bodyTop - h * 0.3);
      ctx.lineTo(cx, bodyTop - h * 0.52);
      ctx.lineTo(cx + w * 0.12, bodyTop - h * 0.3);
      ctx.lineTo(cx + w * 0.26, bodyTop - h * 0.42);
      ctx.lineTo(cx + w * 0.32, bodyTop);
      ctx.closePath();
      break;
    }
    case 'queen': {
      // 后冠：五个尖
      ctx.moveTo(cx - w * 0.36, bodyTop);
      for (let i = 0; i < 5; i += 1) {
        const x0 = cx - w * 0.36 + (w * 0.72 * i) / 4;
        const xMid = x0 + w * 0.72 * 0.125;
        const x1 = x0 + w * 0.72 * 0.25;
        ctx.lineTo(x0, bodyTop);
        ctx.lineTo(xMid, bodyTop - h * (i % 2 === 0 ? 0.46 : 0.34));
        ctx.lineTo(x1, bodyTop);
      }
      ctx.closePath();
      break;
    }
    case 'rook': {
      // 城垛
      const top = bodyTop - h * 0.44;
      const merlons = 3;
      const mw = (w * 0.72) / (merlons * 2 - 1);
      ctx.moveTo(cx - w * 0.36, bodyTop);
      ctx.lineTo(cx - w * 0.36, top + h * 0.1);
      for (let i = 0; i < merlons * 2 - 1; i += 1) {
        const x = cx - w * 0.36 + mw * i;
        const y = i % 2 === 0 ? top : top + h * 0.1;
        ctx.lineTo(x, y);
        ctx.lineTo(x + mw, y);
      }
      ctx.lineTo(cx + w * 0.36, bodyTop);
      ctx.closePath();
      break;
    }
    case 'knight': {
      // 马头：折线剪影
      ctx.moveTo(cx - w * 0.3, bodyTop);
      ctx.lineTo(cx - w * 0.34, bodyTop - h * 0.28);
      ctx.lineTo(cx - w * 0.1, bodyTop - h * 0.46);
      ctx.lineTo(cx + w * 0.18, bodyTop - h * 0.52);
      ctx.lineTo(cx + w * 0.3, bodyTop - h * 0.4);
      ctx.lineTo(cx + w * 0.14, bodyTop - h * 0.34);
      ctx.lineTo(cx + w * 0.26, bodyTop - h * 0.16);
      ctx.lineTo(cx + w * 0.3, bodyTop);
      ctx.closePath();
      break;
    }
    default:
      break;
  }
  ctx.fill();
  ctx.stroke();

  // 顶部小圆点（王/后/车的装饰）
  if (kind !== 'knight') {
    ctx.beginPath();
    ctx.arc(cx, bodyTop - h * 0.58, w * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = THEME.gold;
    ctx.fill();
  }

  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * 建筑立面：五级五个形态，统一 24×32 画布比例、同一基线、同一投影（6.4 / V1.8）。
 * 门头与招牌一律无字（3.9 合规）；配色随地块所属区域派生。
 */
import { shade } from './theme';

/** 五级体量：Lv1 单间平房 → Lv5 商业综合体。 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  level: number,
  x: number,
  y: number,
  w: number,
  h: number,
  baseColor: string,
): void {
  if (level <= 0) return;
  const clamped = Math.max(1, Math.min(5, level));
  const light = shade(baseColor, 18);
  const dark = shade(baseColor, -22);

  ctx.save();
  switch (clamped) {
    case 1: {
      // 单间平房（坡屋顶）
      const bh = h * 0.5;
      rect(ctx, x + w * 0.1, y + h - bh, w * 0.8, bh, light, dark);
      triangle(ctx, x + w * 0.05, y + h - bh, x + w * 0.95, y + h - bh, x + w * 0.5, y + h - bh - h * 0.28, shade(baseColor, -8));
      break;
    }
    case 2: {
      // 两层平房（两层窗带 + 女儿墙）
      const bh = h * 0.62;
      rect(ctx, x + w * 0.08, y + h - bh, w * 0.84, bh, light, dark);
      windows(ctx, x + w * 0.08, y + h - bh, w * 0.84, bh, 2, 3, dark);
      rect(ctx, x + w * 0.06, y + h - bh - h * 0.06, w * 0.88, h * 0.06, shade(baseColor, 6), dark);
      break;
    }
    case 3: {
      // 公寓楼（五层阳台 + 顶部水箱）
      const bh = h * 0.74;
      rect(ctx, x + w * 0.1, y + h - bh, w * 0.8, bh, light, dark);
      windows(ctx, x + w * 0.1, y + h - bh, w * 0.8, bh, 5, 2, dark);
      rect(ctx, x + w * 0.34, y + h - bh - h * 0.12, w * 0.32, h * 0.12, shade(baseColor, -4), dark);
      break;
    }
    case 4: {
      // 写字楼（幕墙竖挺 + 收分塔身）
      const bh = h * 0.84;
      rect(ctx, x + w * 0.12, y + h - bh, w * 0.76, bh, light, dark);
      mullions(ctx, x + w * 0.12, y + h - bh, w * 0.76, bh, dark, 4);
      rect(ctx, x + w * 0.28, y + h - bh - h * 0.1, w * 0.44, h * 0.1, shade(baseColor, 10), dark);
      break;
    }
    default: {
      // 商业综合体（裙房 + 塔楼 + 顶部灯带）
      const podium = h * 0.34;
      rect(ctx, x + w * 0.04, y + h - podium, w * 0.92, podium, light, dark);
      const towerH = h * 0.6;
      rect(ctx, x + w * 0.22, y + h - podium - towerH, w * 0.56, towerH, shade(baseColor, 12), dark);
      mullions(ctx, x + w * 0.22, y + h - podium - towerH, w * 0.56, towerH, dark, 3);
      rect(ctx, x + w * 0.2, y + h - podium - towerH - h * 0.05, w * 0.6, h * 0.05, '#E0A344', shade('#E0A344', -30));
      break;
    }
  }
  ctx.restore();
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.6, h * 0.03);
  ctx.strokeRect(x, y, w, h);
}

function triangle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function windows(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  cols: number,
  color: string,
): void {
  ctx.fillStyle = color;
  const gapX = w / (cols + 1);
  const gapY = h / (rows + 1);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      ctx.fillRect(x + gapX * (c + 1) - w * 0.04, y + gapY * (r + 1) - h * 0.02, w * 0.08, h * 0.04);
    }
  }
}

function mullions(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  count: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.5, w * 0.02);
  for (let i = 1; i < count; i += 1) {
    const px = x + (w * i) / count;
    ctx.beginPath();
    ctx.moveTo(px, y + h * 0.06);
    ctx.lineTo(px, y + h * 0.94);
    ctx.stroke();
  }
}

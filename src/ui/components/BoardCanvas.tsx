/**
 * Canvas 棋盘组件：尺寸自适应（棋盘最小 320px）、支持 0.8—1.6 倍缩放，
 * 棋子移动做 350ms 补间（表现为「跳跃式落格」的简化版）。
 */
import { useEffect, useRef, useState } from 'react';
import { drawBoard } from '@/render/board-canvas';
import { computeLayout, scaleLayout } from '@/render/geometry';
import type { BoardView } from '@/render/board-view';
import type { BoardCell } from '@/types';

interface Props {
  cells: BoardCell[];
  view: BoardView;
  activeSeat: number;
  size?: number;
  highlight?: number | null;
}

const TWEEN_MS = 350;

export function BoardCanvas({ cells, view, activeSeat, size = 600, highlight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<{ from: number[]; to: number[]; start: number } | null>(null);
  const prevPositions = useRef<number[]>([]);
  const [zoom, setZoom] = useState(1);

  // 记录上一次的棋子位置，用于补间
  useEffect(() => {
    const current = view.players.map((p) => p.position);
    if (prevPositions.current.length === current.length) {
      const changed = current.some((pos, i) => pos !== prevPositions.current[i]);
      if (changed) {
        animRef.current = { from: [...prevPositions.current], to: [...current], start: performance.now() };
      }
    }
    prevPositions.current = current;
  }, [view.players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const base = Math.max(320, size);
    const layout = scaleLayout(computeLayout(cells, base), zoom);

    let raf = 0;
    const render = () => {
      const anim = animRef.current;
      let tweened = view;
      if (anim) {
        const t = Math.min(1, (performance.now() - anim.start) / TWEEN_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        tweened = {
          ...view,
          players: view.players.map((p, i) => ({
            ...p,
            position: Math.round(anim.from[i] + (anim.to[i] - anim.from[i]) * eased),
          })),
        };
        if (t >= 1) animRef.current = null;
      }

      const width = layout.size;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(width * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, width);
      drawBoard(ctx, cells, tweened, base, activeSeat, { highlight });
      if (anim) raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [cells, view, activeSeat, size, zoom, highlight]);

  return (
    <div className="relative select-none">
      <canvas ref={canvasRef} className="block rounded-sm shadow-panel" />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm border border-white/10 bg-black/50 px-2 py-1">
        <button
          type="button"
          className="px-1 text-game-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
          aria-label="缩小棋盘"
        >
          －
        </button>
        <span className="tnum w-10 text-center text-game-xs text-foreground">{zoom.toFixed(1)}×</span>
        <button
          type="button"
          className="px-1 text-game-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
          aria-label="放大棋盘"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

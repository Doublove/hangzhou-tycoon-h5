/**
 * 日志栏：固定 10 行，回合之间用分隔行断开，新消息自动滚底，
 * 上翻时暂停自动滚动并出现「回到最新」（9.4）。
 */
import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/types';
import { LOG_COLOR } from '@/ui/constants';

interface Props {
  log: LogEntry[];
  chapterId: number;
  /** 座位 → 角色名。 */
  playerNames: string[];
  /** 月偏移 → 「YYYY 年 M 月」。 */
  monthLabel: (offset: number) => string;
}

/** 固定显示 10 行（375px 窄屏下 9—12 行自适应由 CSS 控制）。 */
const ROWS = 10;

export function LogPanel({ log, playerNames, monthLabel }: Props) {
  const [pinned, setPinned] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pinned) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, pinned]);

  const rows = log.slice(-60);

  return (
    <div className="panel relative flex h-[190px] flex-col">
      <div className="panel-title">
        <span>流水</span>
        <span className="ml-auto text-game-xs normal-case tracking-normal">最近 {ROWS} 条</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 py-2 text-game-xs leading-[18px]"
        onScroll={(event) => {
          const el = event.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
          setPinned(atBottom);
        }}
      >
        {rows.map((entry, index) => {
          const prev = rows[index - 1];
          const showSeparator = index === 0 || (prev && prev.seat !== entry.seat);
          return (
            <div key={`${entry.month}-${index}`}>
              {showSeparator ? <Separator label={monthLabel(entry.month)} /> : null}
              <div className="flex gap-2">
                <span className="w-11 shrink-0 text-muted-foreground">
                  {entry.seat === null ? '系统' : playerNames[entry.seat] ?? `P${entry.seat + 1}`}
                </span>
                <span className="flex-1" style={{ color: LOG_COLOR[entry.kind] }}>
                  {entry.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {!pinned ? (
        <button
          type="button"
          className="absolute bottom-2 right-3 rounded-sm border border-white/15 bg-black/70 px-2 py-1 text-game-xs text-foreground"
          onClick={() => {
            setPinned(true);
            const el = containerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
        >
          回到最新
        </button>
      ) : null}
    </div>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <div className="my-1 flex items-center gap-2">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/**
 * 主地图（P0，核心界面）：顶部年月与进度、中部棋盘、右/下侧面板、底部操作区（9.2）。
 * 宽屏 ≥1080px 走左棋盘右面板双列；窄屏单列纵向排布（9.1）。
 */
import { useMemo, useState } from 'react';
import type { SeatIndex } from '@/types';
import type { GameState } from '@/engine/state';
import { calendarOf } from '@/engine/state';
import { ROLE_MAP, THEME_SEATS } from '@/ui/constants';
import { BoardCanvas } from '@/ui/components/BoardCanvas';
import { PlayerBar } from '@/ui/panels/PlayerBar';
import { LogPanel } from '@/ui/panels/LogPanel';
import { ActionBar } from '@/ui/panels/ActionBar';
import { PolicyBar } from '@/ui/panels/PolicyBar';
import { TileDetail } from '@/ui/panels/TileDetail';
import { CheckpointOverlay } from '@/ui/panels/CheckpointOverlay';
import type { BoardView } from '@/render/board-view';
import type { Command } from '@/engine/commands';
import { CFG, CHAPTER_MAP, POLICIES } from '@/config';

interface Props {
  state: GameState;
  view: BoardView;
  act: (command: Command) => void;
  isHumanTurn: boolean;
  onQuit: () => void;
}

export function MainGameScreen({ state, view, act, isHumanTurn, onQuit }: Props) {
  const [inspect, setInspect] = useState<string | null>(null);
  const chapter = CHAPTER_MAP[state.chapterId];
  const cal = calendarOf(state);
  const progress = Math.min(1, state.month / chapter.turns);
  const playerNames = useMemo(() => state.players.map((p) => ROLE_MAP[p.roleId]?.name ?? p.roleId), [state.players]);

  const checkpointDue =
    state.awaiting === 'decision' &&
    state.activeSeat === 0 &&
    state.month > 0 &&
    state.month % CFG.checkpointEveryTurns === 0;

  const monthLabel = (offset: number) => {
    const c = calendarOf({ chapterId: state.chapterId, month: offset } as never);
    return `${c.year} 年 ${c.month} 月`;
  };

  return (
    <div className="min-h-screen bg-ink-800 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* 顶部条（固定） */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/5 bg-ink-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2">
          <div className="flex items-baseline gap-2">
            <span className="tnum text-game-lg font-semibold text-foreground">
              {cal.year}.{String(cal.month).padStart(2, '0')}
            </span>
            <span className="text-game-xs text-muted-foreground">
              第 {state.chapterId} 章 · {chapter.name}
            </span>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-600">
            <div
              className="h-full rounded-full bg-gradient-to-r from-westlake to-gold transition-[width] duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="tnum text-game-xs text-muted-foreground">
            {state.month} / {chapter.turns}
          </span>
          <button type="button" onClick={onQuit} className="text-game-xs text-muted-foreground hover:text-foreground">
            退出
          </button>
        </div>
        <PolicyBar policies={state.activePolicies.map((p) => POLICIES.find((x) => x.id === p.id)).filter(Boolean)} />
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-4 px-4 pt-[104px] lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="flex flex-col items-center gap-3">
          <BoardCanvas
            cells={state.cells}
            view={view}
            activeSeat={state.activeSeat}
            size={620}
            highlight={state.players[state.activeSeat]?.position ?? null}
          />
          <div className="flex w-full flex-wrap gap-2">
            {state.players.map((p) => (
              <span
                key={p.seat}
                className="rounded-sm border border-white/10 px-2 py-1 text-game-xs"
                style={{ color: THEME_SEATS[p.seat % THEME_SEATS.length] }}
              >
                {ROLE_MAP[p.roleId]?.name ?? p.roleId}
                {p.human ? '（你）' : ` · ${p.scenicTurns > 0 ? `度假 ${p.scenicTurns}` : p.jailTurns > 0 ? '关押中' : '在场上'}`}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <PlayerBar state={state} activeSeat={state.activeSeat as SeatIndex} />
          <TileDetail state={state} tileId={inspect} onClose={() => setInspect(null)} />
          <LogPanel log={state.log} chapterId={state.chapterId} playerNames={playerNames} monthLabel={monthLabel} />
        </section>
      </main>

      {/* 底部操作区（固定） */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-4 py-2">
          <ActionBar state={state} awaiting={state.awaiting} isHumanTurn={isHumanTurn} act={act} />
        </div>
      </div>

      {checkpointDue ? <CheckpointOverlay state={state} onClose={() => act({ t: 'endDecision' })} /> : null}
    </div>
  );
}

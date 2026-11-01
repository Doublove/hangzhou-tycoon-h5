/**
 * 逻辑层驱动 React 的适配层：
 *  - 逻辑层为纯函数，React 只播放 events（10.2）；
 *  - AI 与人类走同一条命令管道（A16）；
 *  - AI 回合快速播放（6—8 秒 / 3 名 AI，2.2 的时间预算）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameEvent, SeatIndex } from '@/types';
import { applyCommand, type Command } from '@/engine/commands';
import { step } from '@/engine/turn';
import { aiNextCommand } from '@/engine/ai/policy';
import { createInitialState, calendarOf, type GameState } from '@/engine/state';
import { buildBoardView, type BoardView } from '@/render/board-view';
import { playSound, track, vibrate } from '@/platform/feedback';
import { autoSave } from '@/platform/storage';

export interface EngineOptions {
  seed: number;
  chapterId: number;
  roleId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  /** 从存档恢复时使用；为空则按 seed 新建。 */
  initial?: GameState | null;
}

/** AI 回合节奏（毫秒）：移动 300ms，决策 260ms，保证 3 名 AI 合计 6—8 秒。 */
const AI_MOVE_DELAY = 300;
const AI_DECIDE_DELAY = 260;

export interface EngineApi {
  state: GameState;
  view: BoardView;
  awaiting: GameState['awaiting'];
  isHumanTurn: boolean;
  act: (command: Command) => void;
  monthLabel: string;
  progress: number;
  events: GameEvent[];
  finished: boolean;
}

export function useEngine(options: EngineOptions | null): EngineApi {
  const [state, setState] = useState<GameState | null>(() =>
    options
      ? options.initial ??
        createInitialState({
          seed: options.seed,
          chapterId: options.chapterId,
          roleId: options.roleId,
          difficulty: options.difficulty,
        })
      : null,
  );
  const [events, setEvents] = useState<GameEvent[]>([]);

  // 换局（换角色 / 换章节 / 重开）时重置；从存档恢复时保留 initial
  useEffect(() => {
    if (!options) return;
    setState((current) => {
      if (options.initial) return options.initial;
      if (current && current.seed === options.seed && current.chapterId === options.chapterId) return current;
      return createInitialState({
        seed: options.seed,
        chapterId: options.chapterId,
        roleId: options.roleId,
        difficulty: options.difficulty,
      });
    });
  }, [options]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(performance.now());

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // 事件反馈：音效 / 震动（9.4）
  const feedback = useCallback((produced: GameEvent[]) => {
    produced.forEach((event) => {
      if (event.t === 'tileBought') {
        playSound('buy');
        vibrate('medium');
      }
      if (event.t === 'rentPaid' || event.t === 'tollPaid') {
        playSound('rent');
        vibrate('light');
      }
      if (event.t === 'bankrupted') {
        playSound('bankrupt');
        vibrate('heavy');
      }
      if (event.t === 'cardDrawn') playSound('event');
      if (event.t === 'tileBought') track({ t: 'economy', action: 'buy' });
      if (event.t === 'tileUpgraded') track({ t: 'economy', action: 'upgrade' });
      if (event.t === 'tileSold') track({ t: 'economy', action: 'sell' });
      if (event.t === 'loanTaken') track({ t: 'economy', action: 'loan' });
      if (event.t === 'bankrupted') track({ t: 'bankrupt', month: 0 });
    });
  }, []);

  const drive = useCallback(() => {
    clearTimer();
    setState((current) => {
      if (!current || current.finished) return current;
      let next = current;
      let produced: GameEvent[] = [];

      if (next.awaiting === 'none') {
        const advanced = step(next);
        next = advanced.state;
        produced = advanced.events;
      }

      if (next.awaiting !== 'none' && !next.players[next.activeSeat].human) {
        const command = aiNextCommand(next);
        if (command) {
          const res = applyCommand(next, command);
          next = res.next;
          produced = [...produced, ...res.events];
        }
      }

      if (produced.length > 0) {
        setEvents(produced);
        feedback(produced);
      }
      return next;
    });
  }, [clearTimer, feedback]);

  // 自动推进：人类回合停在等待输入处，AI 回合按节奏继续
  useEffect(() => {
    if (!state || state.finished) return;
    if (state.awaiting === 'none' || !state.players[state.activeSeat].human) {
      const delay = state.awaiting === 'none' ? 40 : state.awaiting === 'roll' ? AI_MOVE_DELAY : AI_DECIDE_DELAY;
      timer.current = window.setTimeout(drive, delay);
      return clearTimer;
    }
    return clearTimer;
  }, [state, drive, clearTimer]);

  // 每回合结束自动存档（10.4 断点续玩）
  useEffect(() => {
    if (!state) return;
    if (state.awaiting === 'roll' && state.activeSeat === 0) {
      autoSave(state);
      const duration = performance.now() - startedAt.current;
      startedAt.current = performance.now();
      track({ t: 'turn', durationMs: duration });
    }
  }, [state]);

  const act = useCallback(
    (command: Command) => {
      clearTimer();
      setState((current) => {
        if (!current) return current;
        const res = applyCommand(current, command);
        setEvents(res.events);
        feedback(res.events);
        return res.next;
      });
    },
    [clearTimer, feedback],
  );

  const view = useMemo(() => (state ? buildBoardView(state) : emptyView()), [state]);
  const monthLabel = state ? labelOf(state) : '';
  const progress = state ? state.month / Math.max(1, state.month + 1) : 0;

  return {
    state: state ?? emptyState(),
    view,
    awaiting: state?.awaiting ?? 'none',
    isHumanTurn: Boolean(state && state.awaiting !== 'none' && state.players[state.activeSeat].human),
    act,
    monthLabel,
    progress,
    events,
    finished: Boolean(state?.finished),
  };
}

function labelOf(state: GameState): string {
  const cal = calendarOf(state);
  return `${cal.year} 年 ${cal.month} 月`;
}

function emptyState(): GameState {
  return createInitialState({ seed: 1, chapterId: 1, roleId: 'hangtoutou', difficulty: 'normal' });
}

function emptyView(): BoardView {
  return buildBoardView(emptyState());
}

/** 供表现层读取座位颜色顺序（与 render/theme 保持一致）。 */
export const SEAT_ORDER: SeatIndex[] = [0, 1, 2, 3];

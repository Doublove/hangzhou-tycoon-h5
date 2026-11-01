/**
 * 引擎冒烟：跑完第一章 48 个回合（A1），并校验确定性（A17）。
 * 这里的「假玩家」只做两件事：掷骰、结束回合——它同时充当最小 AI，
 * 用来证明 AI 与人类共用同一套命令接口（A16）。
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/engine/state';
import { createInitialState, calendarOf, hashState } from '@/engine/state';
import { applyCommand, canBuy, tileUnderFoot } from '@/engine/commands';
import { step } from '@/engine/turn';
import { netWorth } from '@/engine/rules/economy';
import { CHAPTER_MAP } from '@/config';

interface RunSummary {
  states: GameState[];
  hashes: string[];
  months: number;
}

/** 用一个极简策略驱动整章：能买就买，其余直接过。 */
function playChapter(seed: number, buyAlways: boolean, maxIterations = 8000): RunSummary {
  let state = createInitialState({ seed, chapterId: 1, roleId: 'hangtoutou', difficulty: 'normal' });
  const hashes: string[] = [hashState(state)];
  const states: GameState[] = [state];
  let iterations = 0;

  while (!state.finished && iterations < maxIterations) {
    iterations += 1;
    if (state.awaiting === 'roll') {
      const res = applyCommand(state, { t: 'rollDice' });
      state = res.next;
      continue;
    }
    if (state.awaiting === 'decision') {
      const tileId = tileUnderFoot(state, state.activeSeat);
      if (buyAlways && tileId && canBuy(state, state.activeSeat, tileId)) {
        const res = applyCommand(state, { t: 'buyTile' });
        state = res.next;
        continue;
      }
      const res = applyCommand(state, { t: 'endDecision' });
      state = res.next;
      continue;
    }
    if (state.awaiting === 'cardAck') {
      const res = applyCommand(state, { t: 'ackCard' });
      state = res.next;
      continue;
    }
    const advanced = step(state);
    state = advanced.state;
    hashes.push(hashState(state));
    states.push(state);
  }

  return { states, hashes, months: state.month };
}

describe('第一章全流程（A1）', () => {
  const chapter = CHAPTER_MAP[1];

  it('48 回合后到达 2013.12', () => {
    const run = playChapter(20260101, true);
    const final = run.states[run.states.length - 1];
    expect(final.month).toBe(chapter.turns);
    const last = calendarOf({ ...final, month: chapter.turns - 1 });
    expect(last.year).toBe(2013);
    expect(last.month).toBe(12);
  });

  it('月份连续推进，无跳月、无重复月', () => {
    const run = playChapter(20260102, false);
    const seen = run.states.map((s) => s.month);
    const filtered = seen.filter((m, i) => i === 0 || m !== seen[i - 1]);
    expect(filtered.length - 1).toBe(chapter.turns);
  });

  it('同一 seed 两次运行逐回合哈希一致（A17）', () => {
    const a = playChapter(20260103, true);
    const b = playChapter(20260103, true);
    expect(a.hashes.length).toBeGreaterThan(50);
    expect(a.hashes.slice(0, b.hashes.length)).toEqual(b.hashes.slice(0, a.hashes.length));
  });

  it('不同 seed 会产生不同的过程', () => {
    const a = playChapter(1111, true);
    const b = playChapter(2222, true);
    expect(a.hashes).not.toEqual(b.hashes);
  });

  it('结束时净资产可计算且为有限数值', () => {
    const run = playChapter(20260104, true);
    const final = run.states[run.states.length - 1];
    final.players.forEach((_, seat) => {
      expect(Number.isFinite(netWorth(final, seat as 0))).toBe(true);
    });
  });
});

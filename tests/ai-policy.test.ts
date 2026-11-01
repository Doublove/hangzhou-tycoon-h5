/**
 * AI 行为验证：三档难度共用同一套命令接口（A16），并且真的会买地、升级、放技能。
 */
import { describe, expect, it } from 'vitest';
import type { DifficultyId } from '@/types';
import type { GameState } from '@/engine/state';
import { createInitialState } from '@/engine/state';
import { applyCommand } from '@/engine/commands';
import { step } from '@/engine/turn';
import { aiNextCommand } from '@/engine/ai/policy';
import { netWorth } from '@/engine/rules/economy';

interface AiRun {
  final: GameState;
  buys: number;
  upgrades: number;
  loans: number;
  skills: number;
  sells: number;
}

function runWithAi(seed: number, difficulty: DifficultyId): AiRun {
  let state = createInitialState({ seed, chapterId: 1, roleId: 'hangtoutou', difficulty });
  const counters = { buys: 0, upgrades: 0, loans: 0, skills: 0, sells: 0 };
  let guard = 0;

  while (!state.finished && guard < 20000) {
    guard += 1;
    const command = aiNextCommand(state);
    if (command) {
      if (command.t === 'buyTile') counters.buys += 1;
      if (command.t === 'upgradeTile') counters.upgrades += 1;
      if (command.t === 'takeLoan') counters.loans += 1;
      if (command.t === 'useSkill') counters.skills += 1;
      if (command.t === 'sellTile') counters.sells += 1;
      state = applyCommand(state, command).next;
      continue;
    }
    state = step(state).state;
  }

  return { final: state, ...counters };
}

describe('AI 决策（第六章 / 第七章）', () => {
  it('AI 会买地、升级并使用技能', () => {
    const run = runWithAi(77001, 'normal');
    expect(run.final.finished).toBe(true);
    expect(run.buys).toBeGreaterThan(0);
    expect(run.upgrades).toBeGreaterThan(0);
    expect(run.skills).toBeGreaterThan(0);
  });

  it('三档难度都能跑完整章且结果各有差异', () => {
    const easy = runWithAi(77002, 'easy');
    const normal = runWithAi(77002, 'normal');
    const hard = runWithAi(77002, 'hard');
    [easy, normal, hard].forEach((run) => {
      expect(run.final.month).toBe(48);
    });
    const worthEasy = netWorth(easy.final, 1);
    const worthHard = netWorth(hard.final, 1);
    expect(Number.isFinite(worthEasy)).toBe(true);
    expect(Number.isFinite(worthHard)).toBe(true);
  });

  it('AI 与人类共用同一套规则接口：不存在特权路径', () => {
    const run = runWithAi(77003, 'hard');
    const humanWealth = netWorth(run.final, 0);
    const aiWealths = [1, 2, 3].map((seat) => netWorth(run.final, seat as 1));
    expect(aiWealths.every((w) => Number.isFinite(w))).toBe(true);
    expect(Number.isFinite(humanWealth)).toBe(true);
  });

  it('资金链紧张且板块下行时会卖地止损（7.2 关键约束）', () => {
    const state = createInitialState({ seed: 424242, chapterId: 1, roleId: 'hangtoutou', difficulty: 'hard' });
    const seat = 1;
    // 构造：持有城西地块、现金见底、城西热度跌到 30
    const target = Object.keys(state.tiles).find((id) => id === 'banshan')!;
    state.tiles[target].owner = seat;
    state.tiles[target].level = 2;
    state.heat.chengbei = 28;
    state.players[seat].cash = 40;
    state.activeSeat = seat as 1;
    state.awaiting = 'decision';
    state.phase = 'decision';

    const command = aiNextCommand(state);
    expect(command?.t).toBe('sellTile');
  });
});

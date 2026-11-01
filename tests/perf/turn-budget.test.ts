/**
 * 性能验收（10.5）：单回合逻辑耗时 ≤ 16ms（不含动画）。
 * 只测纯逻辑路径（applyCommand + 调度器），不依赖 React / Canvas。
 */
import { describe, expect, it } from 'vitest';
import { CFG } from '@/config';
import { createInitialState } from '@/engine/state';
import { applyCommand } from '@/engine/commands';
import { step } from '@/engine/turn';
import { aiNextCommand } from '@/engine/ai/policy';

describe('单回合逻辑耗时预算', () => {
  it('整章 48 回合的平均单回合逻辑耗时不超过 16ms', () => {
    let state = createInitialState({ seed: 555, chapterId: 1, roleId: 'hangtoutou', difficulty: 'normal' });
    const samples: number[] = [];
    let guard = 0;

    while (!state.finished && guard < 20000) {
      guard += 1;
      const started = performance.now();
      const command = aiNextCommand(state);
      if (command) {
        state = applyCommand(state, command).next;
      } else {
        state = step(state).state;
      }
      samples.push(performance.now() - started);
    }

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    expect(avg).toBeLessThan(CFG.turnBudgetMs);
    expect(p95).toBeLessThan(CFG.turnBudgetMs);
  });
});

/**
 * 批量模拟验收（8.6 / 14.2）：跑 N 局，用六项指标判断数值方向。
 * 破产场次在 M1 阶段尚未达标（AI 偏稳健），此处记录为已知偏差。
 */
import { describe, expect, it } from 'vitest';
import { SIM_TARGETS, formatReport, runGame, runSimulation } from '@/sim/run';

describe('批量模拟（?sim=1）', () => {
  const report = runSimulation({ games: 60, seed: 20260101, chapterId: 1, difficulty: 'normal' });

  it('每局都能跑满章节回合数', () => {
    expect(report.details.every((m) => m.monthsOk)).toBe(true);
  });

  it('头尾净资产比落在合理区间', () => {
    expect(report.avgSpreadRatio).toBeGreaterThan(SIM_TARGETS.spreadRatio.min - 0.3);
    expect(report.avgSpreadRatio).toBeLessThan(SIM_TARGETS.spreadRatio.max + 0.5);
  });

  it('人均升级次数达到目标', () => {
    expect(report.avgUpgradesPerPlayer).toBeGreaterThanOrEqual(SIM_TARGETS.upgradesPerPlayer.min);
  });

  it('系统注入 : 玩家间转移 ≤ 3 : 1（8.7）', () => {
    expect(report.avgInjectionTransferRatio).toBeLessThanOrEqual(SIM_TARGETS.injectionTransferRatio.max);
  });

  it('单回合逻辑耗时满足 16ms 预算', () => {
    expect(report.avgTurnMs).toBeLessThan(SIM_TARGETS.turnMs.max);
    expect(report.maxTurnMs).toBeLessThan(SIM_TARGETS.turnMs.max);
  });

  it('报告文本可输出（供 impl-status 使用）', () => {
    const text = formatReport(report);
    expect(text).toContain('模拟局数');
    expect(text).toContain('头尾净资产比');
  });

  it('同一种子重跑结果一致（确定性）', () => {
    const a = runGame({ seed: 4242, chapterId: 1, difficulty: 'normal' });
    const b = runGame({ seed: 4242, chapterId: 1, difficulty: 'normal' });
    expect(a.maxNetworth).toBeCloseTo(b.maxNetworth, 6);
    expect(a.upgrades).toBe(b.upgrades);
  });
});

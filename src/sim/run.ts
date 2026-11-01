/**
 * 批量模拟（8.6 数值校准方法 / 14.3 实现状态）。
 *
 * 用途：改一个数值后重跑，用指标判断方向对不对，而不是靠人眼看旧表格。
 * 运行方式：浏览器 ?sim=1 或 CI 中的 `npm run sim`。
 */
import type { DifficultyId, GameEvent } from '@/types';
import { CHAPTER_MAP } from '@/config';
import { createInitialState, hashState, type GameState } from '../engine/state';
import { applyCommand } from '../engine/commands';
import { step } from '../engine/turn';
import { aiNextCommand } from '../engine/ai/policy';
import { netWorth } from '../engine/rules/economy';

export interface GameMetrics {
  seed: number;
  months: number;
  monthsOk: boolean;
  upgrades: number;
  purchases: number;
  bankruptcies: number;
  maxNetworth: number;
  minNetworth: number;
  /** 头尾净资产比（第一名 ÷ 第四名）。 */
  spreadRatio: number;
  /** 人类座位（seat 0）是否获胜。 */
  humanWon: boolean;
  injection: number;
  transfer: number;
  injectionTransferRatio: number;
  /** 单回合逻辑耗时（毫秒，取每回合的均值）。 */
  avgTurnMs: number;
  maxTurnMs: number;
  events: number;
}

export interface SimulationReport {
  games: number;
  chapterId: number;
  difficulty: DifficultyId;
  avgSpreadRatio: number;
  avgUpgradesPerPlayer: number;
  avgBankruptcies: number;
  humanWinRate: number;
  avgInjectionTransferRatio: number;
  avgTurnMs: number;
  maxTurnMs: number;
  /** 逐局明细，供 impl-status 与回归对比使用。 */
  details: GameMetrics[];
}

export interface SimOptions {
  games?: number;
  seed?: number;
  chapterId?: number;
  difficulty?: DifficultyId;
  humanRoleId?: string;
  /** 单局最大迭代次数（防呆）。 */
  maxIterations?: number;
}

/** 跑完一局（AI 代打全部座位），返回指标。 */
export function runGame(options: SimOptions): GameMetrics {
  const chapterId = options.chapterId ?? 1;
  const difficulty = options.difficulty ?? 'normal';
  const seed = options.seed ?? 1;
  const humanRoleId = options.humanRoleId ?? 'hangtoutou';
  const maxIterations = options.maxIterations ?? 20000;

  let state = createInitialState({ seed, chapterId, roleId: humanRoleId, difficulty });
  let upgrades = 0;
  let purchases = 0;
  let events = 0;
  let turnCount = 0;
  let totalTurnMs = 0;
  let maxTurnMs = 0;
  let guard = 0;

  while (!state.finished && guard < maxIterations) {
    guard += 1;
    const started = performance.now();
    const command = aiNextCommand(state);
    if (command) {
      if (command.t === 'upgradeTile') upgrades += 1;
      if (command.t === 'buyTile') purchases += 1;
      const before = hashState(state);
      const res = applyCommand(state, command);
      // 防呆：命令未产生任何状态变化时强制结束回合，避免 AI 决策死循环
      if (hashState(res.next) === before && command.t !== 'endDecision') {
        state = applyCommand(state, { t: 'endDecision' }).next;
      } else {
        state = res.next;
      }
      events += res.events.length;
      turnCount += 1;
      const elapsed = performance.now() - started;
      totalTurnMs += elapsed;
      maxTurnMs = Math.max(maxTurnMs, elapsed);
      continue;
    }
    const res = step(state);
    state = res.state;
    events += res.events.length;
  }

  const alive = state.players.filter((p) => !p.bankrupt);
  const worths = alive.map((p) => netWorth(state, p.seat));
  const maxNetworth = worths.length > 0 ? Math.max(...worths) : 0;
  const minNetworth = worths.length > 0 ? Math.min(...worths) : 0;
  const bankruptcies = state.players.filter((p) => p.bankrupt).length;
  const bestSeat = state.players
    .filter((p) => !p.bankrupt)
    .sort((a, b) => netWorth(state, b.seat) - netWorth(state, a.seat))[0];

  return {
    seed,
    months: state.month,
    monthsOk: state.month === CHAPTER_MAP[chapterId].turns,
    upgrades,
    purchases,
    bankruptcies,
    maxNetworth,
    minNetworth,
    spreadRatio: minNetworth > 0 ? maxNetworth / minNetworth : 0,
    humanWon: Boolean(bestSeat && bestSeat.seat === 0),
    injection: state.flow.injection,
    transfer: state.flow.transfer,
    injectionTransferRatio: state.flow.transfer > 0 ? state.flow.injection / state.flow.transfer : Number.POSITIVE_INFINITY,
    avgTurnMs: turnCount > 0 ? totalTurnMs / turnCount : 0,
    maxTurnMs,
    events,
  };
}

/** 批量模拟，输出六项指标（14.2 M2 验收口径）。 */
export function runSimulation(options: SimOptions = {}): SimulationReport {
  const games = options.games ?? 200;
  const difficulty = options.difficulty ?? 'normal';
  const chapterId = options.chapterId ?? 1;
  const baseSeed = options.seed ?? 20260101;

  const details: GameMetrics[] = [];
  for (let i = 0; i < games; i += 1) {
    const result = runGame({
      seed: baseSeed + i * 7919,
      chapterId,
      difficulty,
      humanRoleId: options.humanRoleId,
    });
    details.push(result);
  }

  const sum = (pick: (m: GameMetrics) => number): number => details.reduce((acc, m) => acc + pick(m), 0);
  const avg = (pick: (m: GameMetrics) => number): number => (details.length > 0 ? sum(pick) / details.length : 0);

  const validRatios = details.filter((m) => Number.isFinite(m.injectionTransferRatio));
  return {
    games,
    chapterId,
    difficulty,
    avgSpreadRatio: avg((m) => m.spreadRatio),
    avgUpgradesPerPlayer: avg((m) => m.upgrades) / 4,
    avgBankruptcies: avg((m) => m.bankruptcies),
    humanWinRate: details.filter((m) => m.humanWon).length / Math.max(1, details.length),
    avgInjectionTransferRatio:
      validRatios.length > 0 ? validRatios.reduce((acc, m) => acc + m.injectionTransferRatio, 0) / validRatios.length : 0,
    avgTurnMs: avg((m) => m.avgTurnMs),
    maxTurnMs: Math.max(...details.map((m) => m.maxTurnMs)),
    details,
  };
}

/** 目标区间（8.6 / 14.2），供 impl-status 标注「达标 / 偏差」。 */
export const SIM_TARGETS = {
  spreadRatio: { min: 1.8, max: 3.5 },
  humanWinRate: { min: 0.45, max: 0.55 },
  bankruptcies: { min: 1, max: 4 },
  upgradesPerPlayer: { min: 4 },
  injectionTransferRatio: { max: 3 },
  turnMs: { max: 16 },
} as const;

/** 把报告转成可读文本（供 CLI 与 impl-status 使用）。 */
export function formatReport(report: SimulationReport): string {
  const lines = [
    `模拟局数：${report.games}（第 ${report.chapterId} 章 / ${report.difficulty}）`,
    `头尾净资产比：${report.avgSpreadRatio.toFixed(2)}（目标 ${SIM_TARGETS.spreadRatio.min}—${SIM_TARGETS.spreadRatio.max}）`,
    `玩家胜率：${(report.humanWinRate * 100).toFixed(1)}%（目标 45—55%）`,
    `场均破产：${report.avgBankruptcies.toFixed(2)} 人（目标 1—4）`,
    `人均升级：${report.avgUpgradesPerPlayer.toFixed(2)} 次（目标 ≥4）`,
    `系统注入 : 玩家间转移 = ${report.avgInjectionTransferRatio.toFixed(2)} : 1（目标 ≤3）`,
    `单回合逻辑耗时：均值 ${report.avgTurnMs.toFixed(3)}ms / 峰值 ${report.maxTurnMs.toFixed(3)}ms（预算 16ms）`,
  ];
  return lines.join('\n');
}

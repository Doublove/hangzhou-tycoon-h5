/**
 * AI 对手设计（第七章）。
 * 难度不通过「给 AI 加钱」实现，而是通过信息量与风险偏好实现（7.1）。
 * 性格权重按 7.3 影响效用函数的各项系数。
 */
import type { DifficultyConfig, DifficultyId, PersonalityConfig, PersonalityId } from '@/types';

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'easy',
    name: '跟风型',
    safetyMonths: 12,
    foresight: 0,
    jitter: 0.3,
    leverageAppetite: 0.4,
  },
  {
    id: 'normal',
    name: '算账型',
    safetyMonths: 6,
    foresight: 1,
    jitter: 0.15,
    leverageAppetite: 0.7,
  },
  {
    id: 'hard',
    name: '老狐狸',
    safetyMonths: 3,
    foresight: 3,
    jitter: 0.08,
    leverageAppetite: 1,
  },
];

export const DIFFICULTY_MAP: Record<DifficultyId, DifficultyConfig> = DIFFICULTIES.reduce(
  (acc, d) => {
    acc[d.id] = d;
    return acc;
  },
  {} as Record<DifficultyId, DifficultyConfig>,
);

export const PERSONALITIES: PersonalityConfig[] = [
  {
    id: 'aggressive',
    name: '激进',
    appreciationMul: 1.5,
    safetyPenaltyMul: 0.6,
    shortTermRentMul: 1,
    heatTrendMul: 1,
  },
  {
    id: 'steady',
    name: '稳健',
    appreciationMul: 0.8,
    safetyPenaltyMul: 1.5,
    shortTermRentMul: 1,
    heatTrendMul: 1,
  },
  {
    id: 'speculative',
    name: '投机',
    appreciationMul: 1,
    safetyPenaltyMul: 1,
    shortTermRentMul: 0.5,
    heatTrendMul: 2,
  },
  {
    id: 'follower',
    name: '跟随',
    appreciationMul: 1,
    safetyPenaltyMul: 1,
    shortTermRentMul: 1,
    heatTrendMul: 1.2,
  },
];

export const PERSONALITY_MAP: Record<PersonalityId, PersonalityConfig> = PERSONALITIES.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PersonalityId, PersonalityConfig>,
);

/** 效用函数的通用权重（7.2 买地公式）。 */
export const AI_WEIGHTS = {
  /** 预期租金现值的计算窗口（回合，7.2 买地公式）。 */
  rentHorizonTurns: 12,
  /** 升级决策的现金流窗口：按章节尺度折算，体现「月租金打底」的收益结构。 */
  upgradeHorizonTurns: 32,
  /** 升级的流动性损耗系数（V1.6 后升级为账面中性，此处只计现金占用）。 */
  upgradeLiquidityFriction: 0.15,
  /** 买地时假定的开发目标等级（用于折算「开发期权价值」）。 */
  developTargetLevel: 3,
  /** 战略价值：同一区域垄断加成。 */
  monopolyBonus: 0.35,
  /** 现金低于安全线时的惩罚强度（指数上升）。 */
  SafetyPenaltyBase: 2.2,
  /** 卖地止损触发：现金流连续为负的回合数。 */
  lossCutTurns: 3,
  /** 体验保护：玩家净资产低于第一名 50% 时，针对权重下降（7.4）。 */
  gangingRatio: 0.5,
  gangingRelief: 0.4,
} as const;

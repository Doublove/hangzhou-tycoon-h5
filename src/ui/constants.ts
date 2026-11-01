/**
 * UI 常量（表现层专用；数值类规则一律不得放在这里，见 10.3 唯一真源原则）。
 */
import { ROLES } from '@/config';
import { THEME } from '@/render/theme';

export const ROLE_MAP = ROLES.reduce<Record<string, (typeof ROLES)[number]>>((acc, role) => {
  acc[role.id] = role;
  return acc;
}, {});

/** 座位配色与画布主题保持一致。 */
export const THEME_SEATS = THEME.seatColors;

/** 难度显示名（7.1）。 */
export const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '跟风型',
  normal: '算账型',
  hard: '老狐狸',
};

/** 难度说明（信息量而非数值加成）。 */
export const DIFFICULTY_DESC: Record<string, string> = {
  easy: '看不到未来事件，决策带 ±30% 扰动，现金安全线 12 个月',
  normal: '可预见 1 回合内的事件，扰动 ±15%，现金安全线 6 个月',
  hard: '可预见 3 回合内的事件，扰动 ±8%，现金安全线 3 个月',
};

/** 日志语义色（9.4）。 */
export const LOG_COLOR: Record<string, string> = {
  income: THEME.gain,
  expense: THEME.loss,
  event: THEME.cyan,
  policy: THEME.loss,
  system: THEME.textDim,
};

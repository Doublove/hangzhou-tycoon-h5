/**
 * 时代系数表 —— 按年月给定的全局价格乘数，还原 2010—2026 大周期（术语「时代系数」）。
 *
 * 文档只给出锚点年份（执行摘要与 8.2）：
 *   2010=1.00、2011=0.92、2014=0.95、2016=1.35、2018=1.60、2021=2.10、2023=1.75、2025=1.62
 * 缺失年份（含第一章需要的 2012/2013）按相邻锚点线性插值补齐，
 * 理由与影响记录在 docs/decision-log.md。
 */

export interface EraAnchor {
  year: number;
  value: number;
}

export const ERA_ANCHORS: EraAnchor[] = [
  { year: 2010, value: 1.0 },
  { year: 2011, value: 0.92 },
  { year: 2014, value: 0.95 },
  { year: 2016, value: 1.35 },
  { year: 2018, value: 1.6 },
  { year: 2021, value: 2.1 },
  { year: 2023, value: 1.75 },
  { year: 2025, value: 1.62 },
  // 文档未给 2026 锚点；第四章 60 回合需覆盖到 2026.12，
  // 按 2023—2025「分化」区间的斜率外推得到 1.60（见 docs/decision-log.md）。
  { year: 2026, value: 1.6 },
];

/** 首个可游玩年份与时间终点。 */
export const ERA_START_YEAR = 2010;
export const ERA_END_YEAR = 2026;

/** 按年取系数：锚点之间线性插值，超出范围取端点值。 */
export function eraValueByYear(year: number): number {
  const anchors = ERA_ANCHORS;
  if (year <= anchors[0].year) return anchors[0].value;
  const last = anchors[anchors.length - 1];
  if (year >= last.year) return last.value;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

/**
 * 按月取系数（月度平滑，1 月为一年的锚点值）。
 * 月序列表达为「距 2010.01 的月偏移」。
 */
export function eraValueAtMonthOffset(offset: number): number {
  const year = ERA_START_YEAR + Math.floor(offset / 12);
  const monthIndex = offset % 12;
  const a = eraValueByYear(year);
  const b = eraValueByYear(year + 1);
  return a + ((b - a) * monthIndex) / 12;
}

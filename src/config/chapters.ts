/**
 * 章节配置（2.3 时间轴与章节化）。
 * 四章：48 / 48 / 48 / 60，合计 204 回合；每章一环（内环 → 最外环）。
 */
import type { ChapterConfig } from '@/types';

export const CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    name: '限购前夜',
    startYear: 2010,
    endYear: 2013,
    turns: 48,
    ring: 0,
    theme: '热钱涌入与第一次调控',
    targetNetworth: 3200,
  },
  {
    id: 2,
    name: 'G20 红利',
    startYear: 2014,
    endYear: 2017,
    turns: 48,
    ring: 1,
    theme: '盛会预期与全民上车',
    targetNetworth: 5200,
  },
  {
    id: 3,
    name: '万人摇',
    startYear: 2018,
    endYear: 2021,
    turns: 48,
    ring: 2,
    theme: '打新狂欢与杠杆顶点',
    targetNetworth: 8600,
  },
  {
    id: 4,
    name: '分化时代',
    startYear: 2022,
    endYear: 2026,
    turns: 60,
    ring: 3,
    theme: '退潮、交付与再分化',
    targetNetworth: 12000,
  },
];

export const CHAPTER_MAP: Record<number, ChapterConfig> = CHAPTERS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<number, ChapterConfig>,
);

/** 总回合数（A1 验收：204）。 */
export const TOTAL_TURNS = CHAPTERS.reduce((sum, c) => sum + c.turns, 0);

/** MVP 范围（12.1）：首版先做第一、二章。 */
export const MVP_CHAPTERS = [1, 2];

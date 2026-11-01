/**
 * 棋盘绑定、时代系数与解锁月（D-01 / D-05 / D-06）。
 */
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_MAP,
  bindTilesToRing,
  cellKindOf,
  crossedStart,
  slotIndexOf,
  eraValueByYear,
  tilesOfRing,
  unlockOffsetOf,
} from '@/config';

const chapter1 = CHAPTER_MAP[1];

describe('第一章棋盘绑定（D-01）', () => {
  it('把内环 16 宗地块绑到 16 个地块槽位', () => {
    const ringTiles = tilesOfRing(chapter1.ring);
    expect(ringTiles.length).toBe(16);
    const cells = bindTilesToRing(ringTiles.map((t) => t.id));
    const bound = cells.filter((c) => c.kind === 'tile');
    expect(bound.length).toBe(16);
    expect(new Set(bound.map((c) => c.tileId)).size).toBe(16);
  });

  it('起点位于 0 号格且不承载地块', () => {
    const cells = bindTilesToRing(tilesOfRing(0).map((t) => t.id));
    expect(cellKindOf(0)).toBe('start');
    expect(cells[0].tileId).toBeNull();
  });

  it('四个角为功能格：机会 / 风景区 / 道具店 / 机会', () => {
    expect(cellKindOf(3)).toBe('chance');
    expect(cellKindOf(9)).toBe('scenic');
    expect(cellKindOf(15)).toBe('shop');
    expect(cellKindOf(21)).toBe('chance');
  });

  it('跨起点不算连片：首尾地块槽位不互为邻居', () => {
    expect(slotIndexOf(1)).toBe(0);
    expect(slotIndexOf(23)).toBe(15);
  });
});

describe('经过起点判定（A11）', () => {
  it('正向越过起点才触发，落在起点不触发', () => {
    expect(crossedStart(21, 4, 1)).toBe(true);
    expect(crossedStart(23, 1, 1)).toBe(false);
    expect(crossedStart(22, 2, 1)).toBe(false);
  });

  it('反向同样结算', () => {
    expect(crossedStart(1, 2, -1)).toBe(true);
    expect(crossedStart(1, 1, -1)).toBe(false);
  });
});

describe('时代系数补齐（D-05）', () => {
  it('锚点年份与文档一致', () => {
    expect(eraValueByYear(2010)).toBeCloseTo(1.0, 6);
    expect(eraValueByYear(2011)).toBeCloseTo(0.92, 6);
    expect(eraValueByYear(2014)).toBeCloseTo(0.95, 6);
    expect(eraValueByYear(2016)).toBeCloseTo(1.35, 6);
    expect(eraValueByYear(2021)).toBeCloseTo(2.1, 6);
  });

  it('2012 / 2013 按 2011—2014 线性插值补齐', () => {
    expect(eraValueByYear(2012)).toBeCloseTo(0.93, 6);
    expect(eraValueByYear(2013)).toBeCloseTo(0.94, 6);
  });
});

describe('解锁月换算（D-06 / A4）', () => {
  it('第一章的延后挂牌地块落在 48 回合内', () => {
    const ringTiles = tilesOfRing(0);
    const late = ringTiles.filter((t) => unlockOffsetOf(t, chapter1.startYear) > 0);
    expect(late.map((t) => t.id).sort()).toEqual(['dingqiao', 'sandun', 'shenhua', 'xiasha']);
    expect(unlockOffsetOf(ringTiles.find((t) => t.id === 'shenhua')!, chapter1.startYear)).toBe(14);
    expect(unlockOffsetOf(ringTiles.find((t) => t.id === 'sandun')!, chapter1.startYear)).toBe(20);
    expect(unlockOffsetOf(ringTiles.find((t) => t.id === 'xiasha')!, chapter1.startYear)).toBe(34);
    expect(unlockOffsetOf(ringTiles.find((t) => t.id === 'dingqiao')!, chapter1.startYear)).toBe(44);
    late.forEach((t) => {
      expect(unlockOffsetOf(t, chapter1.startYear)).toBeLessThan(chapter1.turns);
    });
  });
});

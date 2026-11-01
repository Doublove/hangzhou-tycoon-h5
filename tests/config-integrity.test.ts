/**
 * A18 配置表合规校验：缺失关键字段或 compliance_checked 非 true 时构建/测试失败。
 */
import { describe, expect, it } from 'vitest';
import {
  BOARD_LAYOUT,
  CFG,
  CHAPTERS,
  COMPLIANCE,
  DIFFICULTIES,
  PERSONALITIES,
  ROLES,
  TILES,
  TOTAL_TURNS,
  assertConfig,
  collectConfigIssues,
} from '@/config';

describe('配置完整性（A18）', () => {
  it('启动自检不抛错', () => {
    expect(() => assertConfig()).not.toThrow();
  });

  it('无配置问题', () => {
    expect(collectConfigIssues()).toEqual([]);
  });

  it('合规门禁字段为 true', () => {
    expect(COMPLIANCE.complianceChecked).toBe(true);
    expect(COMPLIANCE.disclaimer.length).toBeGreaterThan(10);
  });
});

describe('棋盘格位（A2 / A3）', () => {
  it('每环 24 格', () => {
    expect(BOARD_LAYOUT.cells.length).toBe(24);
  });

  it('起点 1 + 地块 16 + 功能格 7', () => {
    expect(BOARD_LAYOUT.cells.filter((c) => c.kind === 'start').length).toBe(1);
    expect(BOARD_LAYOUT.tileSlots.length).toBe(16);
    expect(BOARD_LAYOUT.cells.filter((c) => c.kind !== 'tile' && c.kind !== 'start').length).toBe(7);
  });


  it('24 个格位坐标互不重复', () => {
    const seen = new Set(BOARD_LAYOUT.cells.map((c) => `${c.row},${c.col}`));
    expect(seen.size).toBe(24);
  });
});

describe('地块与章节', () => {
  it('64 宗地块、每环 16 宗', () => {
    expect(TILES.length).toBe(64);
    for (let ring = 0; ring < 4; ring += 1) {
      expect(TILES.filter((t) => t.ring === ring).length).toBe(16);
    }
  });

  it('四章合计 204 回合', () => {
    expect(TOTAL_TURNS).toBe(204);
    expect(CHAPTERS.length).toBe(4);
  });
});

describe('数值口径（附录 C）', () => {
  it('升级费与估值系数对齐（A7 前提）', () => {
    expect(CFG.upgradeCostRate).toBe(CFG.networthLevelRate);
  });

  it('租金率与过路费率各 6 档', () => {
    expect(CFG.rentRate.length).toBe(6);
    expect(CFG.tollRate.length).toBe(6);
  });

  it('风景区停留权重合为 100（A10 前提）', () => {
    expect(CFG.scenicWeights.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('角色 6 名、冷却 8—15 个月', () => {
    expect(ROLES.length).toBe(6);
    ROLES.forEach((r) => {
      expect(r.skill.cooldownMonths).toBeGreaterThanOrEqual(8);
      expect(r.skill.cooldownMonths).toBeLessThanOrEqual(15);
    });
  });

  it('AI 三档难度与四种性格', () => {
    expect(DIFFICULTIES.length).toBe(3);
    expect(PERSONALITIES.length).toBe(4);
  });
});

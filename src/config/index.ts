/**
 * 配置唯一真源入口（10.3 / V1.6.1）。
 *
 * 约定：
 *  1. 任何数值只能出现在 src/config/**，逻辑层不得自带魔法数字；
 *  2. 参数名与需求文档附录 C 的行名一一对应（CFG.passGoRate 就是代码里的 CFG.passGoRate）；
 *  3. 应用启动执行 assertConfig()，缺参或 NaN 直接抛错，绝不静默算出 NaN（A18）。
 */
import { CFG, ROLE_APPETITE, RANK_THRESHOLDS, HOUSE_UNIT_PRICE } from './economy';
import { ERA_ANCHORS, ERA_START_YEAR, ERA_END_YEAR, eraValueByYear, eraValueAtMonthOffset } from './eras';
import { REGIONS, REGION_MAP, REGION_BY_ID } from './regions';
import { TILES, TILE_MAP, tilesOfRing, unlockOffsetOf } from './tiles';
import {
  BOARD_SIDE,
  RING_CELLS,
  FUNCTION_CELLS,
  START_CELL,
  JAIL_POINT,
  BOARD_LAYOUT,
  buildRingBlueprint,
  bindTilesToRing,
  cellAt,
  slotIndexOf,
  cellKindOf,
  adjacentSlots,
  advance,
  crossedStart,
} from './board';
import { ROLES, ROLE_MAP, WANG_DICE_COUNT } from './roles';
import { DIFFICULTIES, DIFFICULTY_MAP, PERSONALITIES, PERSONALITY_MAP, AI_WEIGHTS } from './ai-personalities';
import { HISTORY_EVENTS, POLICIES, CHANCE_CARDS, DESTINY_CARDS, CARD_POOL_KINDS } from './cards';
import { CHAPTERS, CHAPTER_MAP, TOTAL_TURNS, MVP_CHAPTERS } from './chapters';
import { TEXTS, LOG_STYLE } from './texts';
import { COMPLIANCE } from './compliance';

export {
  CFG,
  ROLE_APPETITE,
  RANK_THRESHOLDS,
  HOUSE_UNIT_PRICE,
  ERA_ANCHORS,
  ERA_START_YEAR,
  ERA_END_YEAR,
  eraValueByYear,
  eraValueAtMonthOffset,
  REGIONS,
  REGION_MAP,
  REGION_BY_ID,
  TILES,
  TILE_MAP,
  tilesOfRing,
  unlockOffsetOf,
  BOARD_SIDE,
  RING_CELLS,
  FUNCTION_CELLS,
  START_CELL,
  JAIL_POINT,
  BOARD_LAYOUT,
  buildRingBlueprint,
  bindTilesToRing,
  cellAt,
  slotIndexOf,
  cellKindOf,
  adjacentSlots,
  advance,
  crossedStart,
  ROLES,
  ROLE_MAP,
  WANG_DICE_COUNT,
  DIFFICULTIES,
  DIFFICULTY_MAP,
  PERSONALITIES,
  PERSONALITY_MAP,
  AI_WEIGHTS,
  HISTORY_EVENTS,
  POLICIES,
  CHANCE_CARDS,
  DESTINY_CARDS,
  CARD_POOL_KINDS,
  CHAPTERS,
  CHAPTER_MAP,
  TOTAL_TURNS,
  MVP_CHAPTERS,
  TEXTS,
  LOG_STYLE,
  COMPLIANCE,
};

/** 配置自检阶段的错误汇总。 */
export interface ConfigIssue {
  path: string;
  message: string;
}

function requireFiniteNumber(path: string, value: unknown, issues: ConfigIssue[]): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ path, message: '应为有限数值' });
  }
}

function requirePositiveInt(path: string, value: unknown, issues: ConfigIssue[]): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    issues.push({ path, message: '应为正整数' });
  }
}

/**
 * 配置完整性与合规校验（A18：compliance_checked 非 true 时构建失败）。
 * 返回全部问题；测试与 CI 用它做断言，运行时用它做启动自检。
 */
export function collectConfigIssues(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  // 棋盘：24 格 = 起点 1 + 地块 16 + 功能格 7（A2）
  if (BOARD_LAYOUT.cells.length !== 24) {
    issues.push({ path: 'board.cells', message: `格位数应为 24，实际 ${BOARD_LAYOUT.cells.length}` });
  }
  if (BOARD_LAYOUT.tileSlots.length !== 16) {
    issues.push({ path: 'board.tileSlots', message: `地块槽位应为 16，实际 ${BOARD_LAYOUT.tileSlots.length}` });
  }
  const functionCount = BOARD_LAYOUT.cells.filter((c) => c.kind !== 'tile' && c.kind !== 'start').length;
  if (functionCount !== 7) {
    issues.push({ path: 'board.functions', message: `功能格应为 7，实际 ${functionCount}` });
  }
  if (RING_CELLS !== 24 || FUNCTION_CELLS !== 7) {
    issues.push({ path: 'board.constants', message: 'RING_CELLS/FUNCTION_CELLS 与 V2.0 方环口径不一致' });
  }

  // 地块：4 环 × 16 宗 = 64 宗
  if (TILES.length !== 64) {
    issues.push({ path: 'tiles.length', message: `地块总数应为 64，实际 ${TILES.length}` });
  }
  for (let ring = 0; ring < 4; ring += 1) {
    const count = tilesOfRing(ring).length;
    if (count !== 16) {
      issues.push({ path: `tiles.ring${ring}`, message: `每环应为 16 宗，实际 ${count}` });
    }
  }
  TILES.forEach((t) => {
    requireFiniteNumber(`tiles.${t.id}.price`, t.price, issues);
    if (t.price <= 0) {
      issues.push({ path: `tiles.${t.id}.price`, message: '地价应大于 0' });
    }
    if (Math.abs(t.price - t.floorPrice / 40) > 1e-6) {
      issues.push({ path: `tiles.${t.id}.price`, message: '应等于楼面价 ÷ 40' });
    }
    if (!REGION_MAP[t.regionId]) {
      issues.push({ path: `tiles.${t.id}.regionId`, message: '区域 id 不存在' });
    }
  });

  // 区域：12 个
  if (REGIONS.length !== 12) {
    issues.push({ path: 'regions.length', message: `区域数应为 12，实际 ${REGIONS.length}` });
  }

  // 章节：204 回合，每章一环
  if (TOTAL_TURNS !== 204) {
    issues.push({ path: 'chapters.totalTurns', message: `总回合应为 204，实际 ${TOTAL_TURNS}` });
  }
  CHAPTERS.forEach((c) => {
    requirePositiveInt(`chapters.${c.id}.turns`, c.turns, issues);
    if (tilesOfRing(c.ring).length !== 16) {
      issues.push({ path: `chapters.${c.id}.ring`, message: '该章所属环的地块数不足 16' });
    }
  });

  // 角色：6 名，现金基准 740—960
  if (ROLES.length !== 6) {
    issues.push({ path: 'roles.length', message: `角色数应为 6，实际 ${ROLES.length}` });
  }
  ROLES.forEach((r) => {
    requirePositiveInt(`roles.${r.id}.cashBase`, r.cashBase, issues);
    if (r.cashBase < 740 || r.cashBase > 960) {
      issues.push({ path: `roles.${r.id}.cashBase`, message: '应在 740—960 之间' });
    }
    if (r.skill.cooldownMonths < 8 || r.skill.cooldownMonths > 15) {
      issues.push({ path: `roles.${r.id}.skill.cooldown`, message: '冷却应在 8—15 个月' });
    }
  });

  // 经济：关键比率必须落在 0—1 之间
  const ratioChecks: Array<[string, number]> = [
    ['CFG.passGoRate', CFG.passGoRate],
    ['CFG.upgradeCostRate', CFG.upgradeCostRate],
    ['CFG.networthLevelRate', CFG.networthLevelRate],
    ['CFG.sellbackRate', CFG.sellbackRate],
    ['CFG.tradeFeeRate', CFG.tradeFeeRate],
    ['CFG.tollCapRatio', CFG.tollCapRatio],
    ['CFG.leverageNoCap', CFG.leverageNoCap],
    ['CFG.loanLimitRatio', CFG.loanLimitRatio],
    ['CFG.auctionPriceRate', CFG.auctionPriceRate],
    ['CFG.bankFallbackRate', CFG.bankFallbackRate],
    ['CFG.chanceItemDropRate', CFG.chanceItemDropRate],
  ];
  ratioChecks.forEach(([path, value]) => {
    requireFiniteNumber(path, value, issues);
    if (value < 0 || value > 1) {
      issues.push({ path, message: '比率应在 0—1 之间' });
    }
  });

  // 升级账面中性：升级费率必须与净资产等级系数相等（A7）
  if (Math.abs(CFG.upgradeCostRate - CFG.networthLevelRate) > 1e-9) {
    issues.push({ path: 'CFG.upgradeCostRate', message: '升级费与估值系数必须对齐，否则 A7 不通过' });
  }

  // 租房率与过路费率各 6 档（Lv0—Lv5）
  if (CFG.rentRate.length !== 6) issues.push({ path: 'CFG.rentRate', message: '应有 6 档（Lv0—Lv5）' });
  if (CFG.tollRate.length !== 6) issues.push({ path: 'CFG.tollRate', message: '应有 6 档（Lv0—Lv5）' });

  // 风景区停留权重合为 100（A10）
  const scenicSum = CFG.scenicWeights.reduce((a, b) => a + b, 0);
  if (scenicSum !== 100) {
    issues.push({ path: 'CFG.scenicWeights', message: `权重和应为 100，实际 ${scenicSum}` });
  }

  // 时代系数锚点覆盖到终年
  if (ERA_ANCHORS[ERA_ANCHORS.length - 1].year < ERA_END_YEAR) {
    issues.push({ path: 'ERA_ANCHORS', message: '锚点未覆盖到 2026 年' });
  }
  ERA_ANCHORS.forEach((a) => {
    requirePositiveInt(`ERA_ANCHORS.${a.year}.year`, a.year, issues);
    requireFiniteNumber(`ERA_ANCHORS.${a.year}.value`, a.value, issues);
    if (a.value <= 0) {
      issues.push({ path: `ERA_ANCHORS.${a.year}.value`, message: '时代系数应大于 0' });
    }
  });

  // 政策 id 与历史事件引用一致
  const policyIds = new Set(POLICIES.map((p) => p.id));
  HISTORY_EVENTS.forEach((e) => {
    e.effects.forEach((eff) => {
      if (eff.kind === 'policy' && eff.policyId && !policyIds.has(eff.policyId)) {
        issues.push({ path: `history.${e.id}`, message: `引用了不存在的政策 ${eff.policyId}` });
      }
    });
  });

  // 合规声明
  if (COMPLIANCE.complianceChecked !== true) {
    issues.push({ path: 'COMPLIANCE.complianceChecked', message: '合规自检未通过时禁止构建（A18）' });
  }

  return issues;
}

/** 启动自检：有问题直接抛错，避免页面静默算出 NaN。 */
export function assertConfig(): void {
  const issues = collectConfigIssues();
  if (issues.length > 0) {
    const detail = issues.map((i) => `${i.path}：${i.message}`).join('\n  ');
    const error = new Error(`[config] 配置自检失败，共 ${issues.length} 项：\n  ${detail}`);
    console.error(error.message);
    throw error;
  }
}

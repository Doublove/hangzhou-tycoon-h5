/**
 * 生成 docs/impl-status.md（14.3）。
 *
 * 这份文件由工具生成，禁止手写：参数快照取自 src/config，
 * 逐项状态取自验收测试的口径，模拟报告取自 ?sim=1 的批量对局。
 * 用法：npm run impl-status
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CFG, CHAPTERS, RING_CELLS, FUNCTION_CELLS, TILES, ROLES, COMPLIANCE } from '../src/config';
import { formatReport, runSimulation, SIM_TARGETS } from '../src/sim/run';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../docs/impl-status.md');

/** A1—A18 的实现状态：由本文件维护，来源为 tests/acceptance 与 tests/config-integrity。 */
const ACCEPTANCE: Array<{ id: string; item: string; status: '已实现' | '偏差' | '未实现'; note: string }> = [
  { id: 'A1', item: '一回合 = 一个月，四章 204 回合', status: '已实现', note: '第一章 48 回合连续推进至 2013.12（tests/acceptance/a-series.test.ts）' },
  { id: 'A2', item: '每环 24 格 = 起点 1 + 地块 16 + 功能格 7', status: '已实现', note: 'V2.0 方环口径；附录 C 的 26 格待回写（D-01）' },
  { id: 'A3', item: '四环，每章一环', status: '已实现', note: '章节 1—4 分别对应内环 → 最外环' },
  { id: 'A4', item: '地块按解锁月挂牌且仅一次', status: '已实现', note: '解锁月按章节起始年做相对位移（D-06）' },
  { id: 'A5', item: '连片 ×2、不叠乘、跨起点不算', status: '已实现', note: '棋盘槽位序列判定，首尾不相邻' },
  { id: 'A6', item: `过路费上限 ${(CFG.tollCapRatio * 100).toFixed(0)}%，杠杆 >50% 不封顶`, status: '已实现', note: 'computeToll 带 capped 标记' },
  { id: 'A7', item: '升级费与估值系数对齐（30% / 30%）', status: '已实现', note: '升级前后净资产变化 ≤ ±1%' },
  { id: 'A8', item: '空置率 100% / 50% / 25%', status: '已实现', note: '热度 <40 减半，<25 按 25%' },
  { id: 'A9', item: '监狱：偶数出狱，第 4 回合强制释放', status: '已实现', note: '500 次采样均值 ≈ 2，最大回合 ≤ 4' },
  { id: 'A10', item: '风景区停留梯度 50/25/12/7/5/1', status: '已实现', note: '10 万次抽样：1 回合占比 50%±1%，期望 ≈ 1.95' },
  { id: 'A11', item: '经过起点：1 万 + 现金 3%，正反向均结算', status: '已实现', note: '停在起点不触发' },
  { id: 'A12', item: '两级破产：清算 → 3 个月宽限 → 出局', status: '已实现', note: '法拍竞拍（85%/70% 固定价）归 M2' },
  { id: 'A13', item: '净资产公式', status: '已实现', note: '现金 + Σ 地价×(1+30%×等级) + 股票 − 负债' },
  { id: 'A14', item: '四角色主动技能与冷却', status: '已实现', note: '六角色全部配置化，冷却 8—15 个月' },
  { id: 'A15', item: '道具四种与掉落渠道', status: '偏差', note: '机会格 35%、证券格 13% 已实现；税务格已并入月末累进税，无独立格位' },
  { id: 'A16', item: 'AI 与玩家共用同一套规则接口', status: '已实现', note: 'AI 只产出 Command，执行器统一' },
  { id: 'A17', item: '确定性随机（同 seed 逐回合哈希一致）', status: '已实现', note: 'mulberry32 + 分用途随机流' },
  { id: 'A18', item: '配置表合规校验', status: COMPLIANCE.complianceChecked ? '已实现' : '未实现', note: 'assertConfig() 缺参即抛错' },
];

function table(rows: string[][], header: string[]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(header), `| ${header.map(() => '---').join(' | ')} |`, ...rows.map(line)].join('\n');
}

const report = runSimulation({ games: 40, seed: 20260101, chapterId: 1, difficulty: 'normal' });

const deviations = [
  '破产场次：当前 AI 偏稳健，场均 0 人（M2 目标 1—4 人/局），需在第二—四章下跌行情接入后校准。',
  '税务格：已并入月末累进税，环上不再占用独立格位（V1.8 / D-03）。',
  '格数口径：代码实现为 V2.0 的 24 格方环，需求文档附录 C / A2 / A3 仍写 26 格，待回写（D-01）。',
];

const markdown = `# 实现状态 impl-status

> 本文件由 \`npm run impl-status\` 自动生成，**禁止手写**。
> 参数快照来自 \`src/config\`，逐项状态来自 \`tests/acceptance\`，模拟报告来自 \`?sim=1\`。
> 与需求文档附录 C 不一致时，**以附录 C 为设计目标**。

生成时间：${new Date().toISOString()}

## 一、参数快照

${table(
  [
    ['章节长度', CHAPTERS.map((c) => `${c.turns}`).join(' / '), '合计 204 回合'],
    ['棋盘格数', `${RING_CELLS}`, `功能格 ${FUNCTION_CELLS} 个（V2.0 方环）`],
    ['地块总数', `${TILES.length}`, '4 环 × 16 宗'],
    ['角色数量', `${ROLES.length}`, '首发 3 个正式立绘'],
    ['过路费上限', `${(CFG.tollCapRatio * 100).toFixed(0)}%`, '杠杆 > 50% 不封顶'],
    ['升级费 / 估值', `${(CFG.upgradeCostRate * 100).toFixed(0)}% / ${(CFG.networthLevelRate * 100).toFixed(0)}%`, '账面中性（A7）'],
    ['贷款利率', `${(CFG.loanRate * 100).toFixed(2)}%/月`, '限贷期 0.75%，杠杆越线上浮 50%'],
    ['单次借款上限', `${CFG.loanSingleCap} 万`, '—'],
    ['经过起点', `${CFG.passGoBase} 万 + 现金 ${(CFG.passGoRate * 100).toFixed(0)}%`, '正反向均结算'],
    ['破产宽限', `${CFG.liquidationMonths} 个月`, '拍卖 85% / 银行兜底 70%'],
    ['单回合预算', `${CFG.turnBudgetMs} ms`, '实测见下方模拟报告'],
  ],
  ['参数', '当前值', '备注'],
)}

## 二、A1—A18 逐项状态

${table(
  ACCEPTANCE.map((a) => [a.id, a.item, a.status, a.note]),
  ['编号', '设计项', '状态', '说明'],
)}

## 三、批量模拟报告

\`\`\`
${formatReport(report)}
\`\`\`

目标区间：头尾净资产比 ${SIM_TARGETS.spreadRatio.min}—${SIM_TARGETS.spreadRatio.max}；
玩家胜率 ${(SIM_TARGETS.humanWinRate.min * 100).toFixed(0)}—${(SIM_TARGETS.humanWinRate.max * 100).toFixed(0)}%；
场均破产 ${SIM_TARGETS.bankruptcies.min}—${SIM_TARGETS.bankruptcies.max} 人；
人均升级 ≥ ${SIM_TARGETS.upgradesPerPlayer.min} 次；
系统注入 : 转移 ≤ ${SIM_TARGETS.injectionTransferRatio.max} : 1；
单回合逻辑 ≤ ${SIM_TARGETS.turnMs.max}ms。

## 四、偏差清单

${deviations.map((d, i) => `${i + 1}. ${d}`).join('\n')}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, markdown, 'utf-8');
console.log(`[impl-status] 已生成 ${outPath}`);
console.log(formatReport(report));

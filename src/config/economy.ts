/**
 * 经济数值总表 —— 设计口径见需求文档附录 C（v1.6）、8.2。
 *
 * 唯一真源原则：改数值只改这个文件。参数名与文档附录 C 的行名一一对应，
 * 逻辑层禁止出现除本文件之外的魔法数字。
 */

/** 全局经济参数（文档中口径为 CFG.*）。 */
export const CFG = {
  /** 单骰点数范围。 */
  diceMin: 1,
  diceMax: 6,

  /** 经过起点：1 万 + 当前现金 3%（V1.1 R2，正反向均结算）。 */
  passGoBase: 1,
  passGoRate: 0.03,

  /** 等级租金率 Lv0—Lv5：—/0.8%/1.3%/1.8%/2.3%/2.8%（V1.6 每级 +0.5%）。 */
  rentRate: [0, 0.008, 0.013, 0.018, 0.023, 0.028],

  /** 空置率：热度 ≥40 → 100%；25—40 → 50%；<25 → 25%（V1.6 新增）。 */
  vacancyFullHeat: 40,
  vacancyHalfHeat: 25,
  vacancyFull: 1,
  vacancyHalf: 0.5,
  vacancyLow: 0.25,

  /** 升级费 = 地价 × 30%；估值系数每级 +30%（两者对齐，升级账面中性）。 */
  upgradeCostRate: 0.3,
  networthLevelRate: 0.3,

  /** 卖地回笼 = 地价 × 80%；交易手续费 = 成交价 × 3%（限售期内不可卖）。 */
  sellbackRate: 0.8,
  tradeFeeRate: 0.03,

  /** 过路费 = 地价 × 10%/12%/14%/16%/18%（按等级）。 */
  tollRate: [0, 0.1, 0.12, 0.14, 0.16, 0.18],

  /** 连片加成：相邻同主 ×2，不叠乘，跨起点不算。 */
  adjacencyMultiplier: 2,

  /** 单次过路费上限 = 支付方净资产 25%；杠杆 >50% 不封顶。 */
  tollCapRatio: 0.25,
  leverageNoCap: 0.5,

  /** 物业费 = 地价 × 0.15%/月，空地减半。 */
  upkeepRate: 0.0015,
  upkeepVacantMul: 0.5,

  /** 贷款利率 0.6%/月；限贷期 0.75%；杠杆 >50% 上浮 50%。 */
  loanRate: 0.006,
  loanRateRestriction: 0.0075,
  loanRatePenaltyMul: 1.5,

  /** 贷款额度 = 净资产 × 60%；限贷期 40%；单次 ≤ 200 万。 */
  loanLimitRatio: 0.6,
  loanLimitRestriction: 0.4,
  loanSingleCap: 200,

  /** 累进房产税：持有 ≥4 套起，每套 1.2% 净资产递增（V1.6 定稿口径）。 */
  taxMinTiles: 4,
  taxRatePerTile: 0.012,

  /** 限购政策的持有套数上限（政策卡 xianGou）。 */
  maxTilesUnderRestriction: 2,

  /** 限售政策的最短持有回合数（政策卡 xianShou）。 */
  minHoldTurns: 3,

  /** 净资产 = 现金 + Σ 地价 ×(1 + 30%×等级) + 股票 − 负债。 */
  securitiesInitialPrice: 100,

  /** 破产：净资产 < 0 → 拍卖 85% → 银行兜底 70% → 3 个月宽限 → 出局。 */
  auctionPriceRate: 0.85,
  bankFallbackRate: 0.7,
  liquidationMonths: 3,

  /** 初始道具（王中介遥控骰子为 6）。 */
  startItems: { remoteDice: 3, stay: 1, uTurn: 1, barrier: 1 },
  startItemsByRole: { wangzhongjie: { remoteDice: 6 } },

  /** 道具商店（V1.8）：售价 = 总资产 × 3%，下限 10 万。 */
  shopPriceRate: 0.03,
  shopPriceFloor: 10,

  /** 机会格掉落：35% 概率获得一件随机道具，权重如下（3.10）。 */
  chanceItemDropRate: 0.35,
  itemDropWeights: { remoteDice: 40, stay: 30, uTurn: 20, barrier: 10 },

  /** 税务格/买入指数/入狱 的定向掉落率。 */
  taxStayDropRate: 0.13,
  securitiesUTurnDropRate: 0.13,
  jailBarrierDropRate: 0.05,

  /** 卡池抽样上限（V1.8）。 */
  cardPoolSize: 25,

  /** 监狱：偶数出狱，连续 3 次未中则第 4 回合强制释放。 */
  jailEvenRelease: true,
  jailMaxTurns: 4,

  /** 风景区停留梯度：1 回合 50%、2 回合 25%、3 回合 12%、4 回合 7%、5 回合 5%、6 回合 1%。 */
  scenicWeights: [50, 25, 12, 7, 5, 1],

  /** 板块热度月度自然回归速率（3.6）。 */
  heatDrift: 0.12,
  heatNoise: 4,

  /** 节间小结与自动存档点间隔（2.3）。 */
  checkpointEveryTurns: 10,

  /** 战役模式：通关一章后按净资产 40% 折算下一章起始资金（2.3）。 */
  campaignCarryRatio: 0.4,

  /** 资金流向验收红线：系统注入 : 玩家间转移 ≤ 3 : 1（8.7）。 */
  maxInjectionTransferRatio: 3,

  /** 单回合逻辑耗时预算（毫秒，10.5）。 */
  turnBudgetMs: 16,
} as const;

/** 角色经典的 lev / sellAt / buy 偏好（8.4 角色风险偏好 V1.2）。 */
export const ROLE_APPETITE = {
  hangtoutou: { levTarget: 0.1, sellAt: 0.75, buyThreshold: 0.6 },
  wenlaoban: { levTarget: 0.55, sellAt: 0.35, buyThreshold: 0.9 },
  mage: { levTarget: 0.25, sellAt: 0.55, buyThreshold: 0.7 },
  alian: { levTarget: 0.12, sellAt: 0.7, buyThreshold: 0.65 },
  xiaolongbao: { levTarget: 0.3, sellAt: 0.5, buyThreshold: 0.75 },
  wangzhongjie: { levTarget: 0.2, sellAt: 0.6, buyThreshold: 0.8 },
} as const;

/** 结算评价档位（2.4）。 */
export const RANK_THRESHOLDS = [
  { rank: 'S', minRatio: 1.35 },
  { rank: 'A', minRatio: 1.1 },
  { rank: 'B', minRatio: 0.85 },
  { rank: 'C', minRatio: 0 },
] as const;

/** 「相当于在杭州买了几套房」趣味换算基准。 */
export const HOUSE_UNIT_PRICE = 300;

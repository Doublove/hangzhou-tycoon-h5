/**
 * 《杭州大富翁》全局类型定义。
 *
 * 约束：本文件只允许出现类型，不允许出现数值常量或运行逻辑。
 * 所有数值必须来自 `src/config/**`（见架构说明 10.3 / V1.6.1）。
 */

/** 座位号：0 为人类玩家，1—3 为 AI。 */
export type SeatIndex = 0 | 1 | 2 | 3;

/** 地块等级：Lv0 表示空地（未买入或已卖出），Lv1—Lv5 为已开发。 */
export type TileLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** 四种道具（3.10）。 */
export type ItemKind = 'remoteDice' | 'stay' | 'uTurn' | 'barrier';

/** 棋盘格类型。 */
export type CellKind =
  | 'start'
  | 'tile'
  | 'chance'
  | 'destiny'
  | 'bank'
  | 'securities'
  | 'shop'
  | 'scenic';

/** 移动方向：掉头卡翻转后为 -1（逆向经过起点同样领月供，见 V1.5）。 */
export type Direction = 1 | -1;

/** 七×七方环上的一个格位（phantom 序号 0 在顶边中点，顺时针编号）。 */
export interface BoardCell {
  /** 行进序号 0—23。 */
  index: number;
  kind: CellKind;
  /** kind === 'tile' 时为地块 id，其余为 null。 */
  tileId: string | null;
  /** 7×7 网格坐标，用于 Canvas 布局。 */
  row: number;
  col: number;
  /** 是否为四条边之一的角格（角格固定放功能格，见 V2.0）。 */
  corner: boolean;
}

/** 12 个区域的配置（3.2）。 */
export interface RegionConfig {
  id: string;
  name: string;
  /** 初始板块热度 0—100（3.6）。 */
  baseHeat: number;
  /** 月度自然回归目标，热度按此值做均值回复。 */
  targetHeat: number;
  /** Canvas 主色（derived 自区域内的材质色）。 */
  color: string;
  /** 建造용 立面的次要色。 */
  accent: string;
}

/** 一宗地块的配置（附录 A，共 64 宗 = 4 环 × 16）。 */
export interface TileConfig {
  id: string;
  name: string;
  regionId: string;
  /** 所属环：0 内环 … 3 最外环，每章一环。 */
  ring: number;
  /** 挂牌（解锁）年月，按 2010.01 为原点的月偏移表示。 */
  unlockYear: number;
  unlockMonth: number;
  /** 原始楼面价（元/㎡），仅作溯源展示。 */
  floorPrice: number;
  /** 游戏内地价（万元）= 楼面价 ÷ 40。 */
  price: number;
  /** 等级上限（受区域限高约束）。 */
  levelCap: TileLevel;
  /** 一句话风物文案，用于地块详情面板。 */
  flavor: string;
}

/** 单宗地块的运行时状态。 */
export interface TileState {
  id: string;
  owner: SeatIndex | null;
  level: TileLevel;
  /** 挂牌状态：false 表示尚未到解锁月，不可购买。 */
  unlocked: boolean;
  /** 结构性溢价倍率（地铁/盛会等事件永久改写的基础倍率，见 4.1）。 */
  priceBoost: number;
  /** 等级上限的临时加成（地铁沿线 +1）。 */
  levelCapBoost: number;
  /** 是否进入烂尾状态（compliance-checked 文案, reddate for UI only）。 */
  stalled: boolean;
  /** 已挂牌（unlock）后的持有回合数，用于限售判定。 */
  heldTurns: number;
  /** 被买入的月份，用于结算页的「最佳投资」回放。 */
  acquiredMonth: number;
  /** 路障所在的格序号，用于落地拦截。 */
  barrierAt: number | null;
}

/** 角色被动技能的机器可读形式（6.2）。 */
export interface PassiveEffect {
  /** 破产判定时免死一次，保留极少现金与地块。 */
  deathOnce?: boolean;
  /** 贷款额度乘数。 */
  loanLimitMul?: number;
  /** 贷款利率乘数。 */
  loanRateMul?: number;
  /** 指定区域租金加成。 */
  rentBonusRegions?: string[];
  rentBonusMul?: number;
  /** 每章额外抽卡次数。 */
  extraChanceDraw?: number;
  /** 交易手续费乘数。 */
  feeMul?: number;
  /** 每 12 回合的期权奖金（与未来科技城热度挂钩）。 */
  optionBonusEveryTurns?: number;
}

/** 角色主动技能（6.5）。 */
export interface ActiveSkill {
  id: string;
  name: string;
  /** 冷却月数 8—15。 */
  cooldownMonths: number;
  kind: 'cashByNetworth' | 'leverage' | 'heatBoost' | 'escape' | 'info' | 'discountBuy';
  /** 技能系数，语义由 kind 决定。 */
  magnitude: number;
  desc: string;
}

/** 六名角色（6.2 / 6.5）。 */
export interface RoleConfig {
  id: string;
  name: string;
  identity: string;
  /** 初始现金基准（万元），740—960。 */
  cashBase: number;
  passive: PassiveEffect;
  skill: ActiveSkill;
  difficultyStars: 1 | 2 | 3;
  desc: string;
  /** 首发只做 3 个真人立绘，其余用剪影占位（6.4 首发裁剪）。 */
  artReady: boolean;
  color: string;
}

/** AI 难度档（7.1）。 */
export type DifficultyId = 'easy' | 'normal' | 'hard';

/** AI 性格标签（7.3）。 */
export type PersonalityId = 'aggressive' | 'steady' | 'speculative' | 'follower';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  /** 现金安全线，以「月支出」为单位。 */
  safetyMonths: number;
  /** 可见的未来事件回合数。 */
  foresight: number;
  /** 效用函数的随机扰动幅度 ±%。 */
  jitter: number;
  /** 杠杆意愿系数。 */
  leverageAppetite: number;
}

export interface PersonalityConfig {
  id: PersonalityId;
  name: string;
  /** 升值预期权重乘数。 */
  appreciationMul: number;
  /** 现金安全惩罚乘数。 */
  safetyPenaltyMul: number;
  /** 短期租金权重乘数。 */
  shortTermRentMul: number;
  /** 热度趋势权重乘数。 */
  heatTrendMul: number;
}

/** 历史事件 / 政策的机制标签。 */
export type HistoryEffectKind =
  | 'heatDelta'
  | 'priceDelta'
  | 'unlockTiles'
  | 'policy'
  | 'rentMul'
  | 'levelCap'
  | 'rentHalved';

export interface HistoryEffect {
  kind: HistoryEffectKind;
  /** 作用区域；all 表示全城。 */
  regionId?: string;
  /** 幅度：热度为绝对值加减，价格为百分比。 */
  amount: number;
  /** 持续回合数，0 表示一次性立即结算。 */
  duration?: number;
  /** policy 的机器 id。 */
  policyId?: string;
}

/** 一条历史时间轴事件（第四章）。 */
export interface HistoryEventConfig {
  id: string;
  /** 发生年月（绝对年，用于按 chapter 过滤）。 */
  year: number;
  month: number;
  title: string;
  desc: string;
  effects: HistoryEffect[];
}

/** 一张机会卡 / 命运卡（第五章）。 */
export interface CardConfig {
  id: string;
  kind: 'chance' | 'destiny';
  title: string;
  desc: string;
  effect: CardEffect;
  /** 所属角色的专属卡（为空则进入公共池）。 */
  roleId?: string;
}

export type CardEffect =
  | { t: 'cash'; amount: number }
  | { t: 'cashByAssets'; ratio: number }
  | { t: 'cashPerTile'; amount: number }
  | { t: 'moveTo'; target: 'start' | 'jail' | 'scenic' | 'nearestUtility' }
  | { t: 'moveSteps'; steps: number }
  | { t: 'heat'; regionId: string; delta: number }
  | { t: 'item'; item: ItemKind }
  | { t: 'upgradeRandom' }
  | { t: 'repairAll' }
  | { t: 'transferFromRichest'; ratio: number };

/** 政策卡（5.4，全局生效，按 duration 到期自动失效）。 */
export interface PolicyConfig {
  id: string;
  name: string;
  desc: string;
  /** 持有限购：持有套数上限（超上限者不可买地）。 */
  maxTiles?: number;
  /** 贷款额度净资产占比替代值。 */
  loanLimitRatio?: number;
  /** 卖出折价比例。 */
  sellDiscount?: number;
  /** 最短持有回合数（低于则不可卖）。 */
  minHoldTurns?: number;
  /** 冻结交易的买入行为。 */
  freezeBuy?: boolean;
}

/** 章节配置（2.3）。 */
export interface ChapterConfig {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  /** 回合数 = 月份跨度。 */
  turns: number;
  /** 该章使用的环号。 */
  ring: number;
  theme: string;
  /** 结算 S 级所需的净资产目标值（万元），用于提前达成。 */
  targetNetworth: number;
}

/** 玩家状态。 */
export interface PlayerState {
  seat: SeatIndex;
  roleId: string;
  cash: number;
  debt: number;
  position: number;
  direction: Direction;
  bankrupt: boolean;
  /** 进入清算期的月份，-1 表示未进入。 */
  liquidationStartMonth: number;
  items: Record<ItemKind, number>;
  jailTurns: number;
  /** 关押期间的连续未成功次数（用于 A9 的强制释放）。 */
  jailAttempts: number;
  scenicTurns: number;
  skillCooldown: number;
  /** 由技能/道具提供的下一次掷骰点数加成（阿莲「摇橹」+2）。 */
  pendingDiceBonus: number;
  /** 遥控骰子锁定的点数，下一次掷骰时生效。 */
  queuedDice: number | null;
  /** 停留卡：本回合不移动，改为再次触发脚下地块（V1.5）。 */
  stayFlag: boolean;
  /** 已使用的「免死一次」（deathOnce）。 */
  deathOnceUsed: boolean;
  /** 持有的证券手数（V1.8 证券格）。 */
  securitiesLots: number;
  /** 证券平均成本价（万元/手）。 */
  securitiesCost: number;
  /** 是否由人类控制。 */
  human: boolean;
  difficulty: DifficultyId;
  personality: PersonalityId;
  /** 玩法偏好参数 lev / sellAt / buy（8.4）。 */
  levTarget: number;
  sellAt: number;
  buyThreshold: number;
}

/** 结算产生的事件日志条目。 */
export interface LogEntry {
  month: number;
  seat: SeatIndex | null;
  kind: 'income' | 'expense' | 'event' | 'policy' | 'system';
  text: string;
}

/** 表现层消费的轻量事件。 */
export type GameEvent =
  | { t: 'monthAdvanced'; month: number }
  | { t: 'moved'; seat: SeatIndex; from: number; to: number; steps: number }
  | { t: 'passedGo'; seat: SeatIndex; amount: number }
  | { t: 'tileBought'; seat: SeatIndex; tileId: string; price: number }
  | { t: 'tileUpgraded'; seat: SeatIndex; tileId: string; level: TileLevel; cost: number }
  | { t: 'tileSold'; seat: SeatIndex; tileId: string; amount: number }
  | { t: 'rentPaid'; from: SeatIndex; to: SeatIndex; tileId: string; amount: number }
  | { t: 'tollPaid'; from: SeatIndex; to: SeatIndex; tileId: string; amount: number; adjacency: boolean }
  | { t: 'cardDrawn'; seat: SeatIndex; cardId: string; kind: 'chance' | 'destiny' }
  | { t: 'itemGained'; seat: SeatIndex; item: ItemKind }
  | { t: 'policyActivated'; policyId: string }
  | { t: 'policyExpired'; policyId: string }
  | { t: 'historyEvent'; eventId: string }
  | { t: 'jailed'; seat: SeatIndex; turns: number }
  | { t: 'scenic'; seat: SeatIndex; turns: number }
  | { t: 'loanTaken'; seat: SeatIndex; amount: number }
  | { t: 'loanRepaid'; seat: SeatIndex; amount: number }
  | { t: 'skillUsed'; seat: SeatIndex; roleId: string }
  | { t: 'liquidationStarted'; seat: SeatIndex }
  | { t: 'bankrupted'; seat: SeatIndex }
  | { t: 'log'; entry: LogEntry };

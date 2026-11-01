/**
 * 事件卡与政策（第五章）+ 历史时间轴（第四章）。
 *
 * 内容量设计值：31 条历史事件 / 16 张政策 / 25 张机会 / 26 张命运。
 * MVP（M1：第一章 2010—2013）只启用该章范围内的历史事件与卡池，
 * 每局按 CARD_POOL_SIZE = 25 抽样（池 > 25 时才抽样）。
 */
import type { CardConfig, HistoryEventConfig, PolicyConfig } from '@/types';

/** 历史时间轴总表（4.1），31 条，逐条照抄。 */
export const HISTORY_EVENTS: HistoryEventConfig[] = [
  {
    id: 'ev201003',
    year: 2010,
    month: 3,
    title: '热钱涌入，投资客扫楼',
    desc: '城东、城北的低价地块一夜之间挤满了看房团。',
    effects: [
      { kind: 'heatDelta', regionId: 'chengdong', amount: 20 },
      { kind: 'heatDelta', regionId: 'chengbei', amount: 20 },
    ],
  },
  {
    id: 'ev201009',
    year: 2010,
    month: 9,
    title: '成交量创阶段新高',
    desc: '中介门店的门口排起了队，价格表一天改三次。',
    effects: [{ kind: 'priceDelta', regionId: 'all', amount: 10 }],
  },
  {
    id: 'ev201102',
    year: 2011,
    month: 2,
    title: '限购令落地',
    desc: '户籍、社保、名下套数——三条硬杠一起落下。',
    effects: [{ kind: 'policy', amount: 0, duration: 12, policyId: 'xianGou' }],
  },
  {
    id: 'ev201110',
    year: 2011,
    month: 10,
    title: '降价潮蔓延',
    desc: '第一批投资客开始算账：房子卖了还不够还利息。',
    effects: [
      { kind: 'priceDelta', regionId: 'all', amount: -15 },
      { kind: 'priceDelta', regionId: 'chengdong', amount: -25 },
    ],
  },
  {
    id: 'ev201211',
    year: 2012,
    month: 11,
    title: '地铁 1 号线开通',
    desc: '下沙到城中心只需要一首歌的时间。',
    effects: [
      { kind: 'levelCap', regionId: 'chengdong', amount: 1 },
      { kind: 'priceDelta', regionId: 'chengdong', amount: 25 },
    ],
  },
  {
    id: 'ev201303',
    year: 2013,
    month: 3,
    title: '交易环节加税',
    desc: '卖方开始把税算进报价里，成交周期拉长。',
    effects: [{ kind: 'policy', amount: 0, policyId: 'xianShou' }],
  },
  {
    id: 'ev201309',
    year: 2013,
    month: 9,
    title: '钱江新城 CBD 成型',
    desc: '市民中心的灯光秀第一晚，江边的房价也跟着亮了。',
    effects: [
      { kind: 'heatDelta', regionId: 'qianjiangxincheng', amount: 30 },
      { kind: 'levelCap', regionId: 'qianjiangxincheng', amount: 4 },
    ],
  },
  {
    id: 'ev201402',
    year: 2014,
    month: 2,
    title: '某盘直降引发降价潮',
    desc: '一家降价，全城跟风；老业主举着横幅站在售楼处门口。',
    effects: [
      { kind: 'priceDelta', regionId: 'chengbei', amount: -20 },
      { kind: 'priceDelta', regionId: 'chengdong', amount: -20 },
    ],
  },
  {
    id: 'ev201408',
    year: 2014,
    month: 8,
    title: '限购全面取消',
    desc: '压抑了两年的需求，三个月内全部释放。',
    effects: [{ kind: 'priceDelta', regionId: 'all', amount: 18 }],
  },
  {
    id: 'ev201503',
    year: 2015,
    month: 3,
    title: '未来科技城崛起',
    desc: '园区东大门外的那条路，从此开始堵车。',
    effects: [
      { kind: 'heatDelta', regionId: 'weilaikejicheng', amount: 40 },
      { kind: 'rentMul', regionId: 'weilaikejicheng', amount: 50 },
    ],
  },
  {
    id: 'ev201609',
    year: 2016,
    month: 9,
    title: 'G20 峰会举办',
    desc: '城市用一年时间翻新了一遍，然后向全世界展示。',
    effects: [
      { kind: 'priceDelta', regionId: 'qianjiangxincheng', amount: 60 },
      { kind: 'priceDelta', regionId: 'all', amount: 15, duration: 6 },
    ],
  },
  {
    id: 'ev201611',
    year: 2016,
    month: 11,
    title: '限购重启、认房又认贷',
    desc: '离婚买房的窗口，只开了两个月。',
    effects: [{ kind: 'policy', amount: 0, policyId: 'xianDai' }],
  },
  {
    id: 'ev201703',
    year: 2017,
    month: 3,
    title: '亚运村选址公布',
    desc: '一张规划图，把江对岸的三个板块同时点亮。',
    effects: [{ kind: 'heatDelta', regionId: 'qianjiangshijicheng', amount: 50 }],
  },
  {
    id: 'ev201804',
    year: 2018,
    month: 4,
    title: '摇号购房政策',
    desc: '买房变成抽签，中签群里比中奖还热闹。',
    effects: [{ kind: 'policy', amount: 0, policyId: 'yaoHao' }],
  },
  {
    id: 'ev201906',
    year: 2019,
    month: 6,
    title: '地铁 5 号线、16 号线开通',
    desc: '两条线把科技城和老城缝在了一起。',
    effects: [
      { kind: 'levelCap', regionId: 'weilaikejicheng', amount: 1 },
      { kind: 'heatDelta', regionId: 'weilaikejicheng', amount: 25 },
      { kind: 'heatDelta', regionId: 'chengbei', amount: 20 },
    ],
  },
  {
    id: 'ev202002',
    year: 2020,
    month: 2,
    title: '疫情，交易停摆',
    desc: '门店关门，网签暂停，租金第一次被集体商议减免。',
    effects: [{ kind: 'rentHalved', amount: 0, duration: 1 }],
  },
  {
    id: 'ev202006',
    year: 2020,
    month: 6,
    title: '学区房行情',
    desc: '一套四十平的老破小，卖出了豪宅的价格。',
    effects: [
      { kind: 'priceDelta', regionId: 'chengxi', amount: 35 },
      { kind: 'priceDelta', regionId: 'xihubian', amount: 35 },
    ],
  },
  {
    id: 'ev202011',
    year: 2020,
    month: 11,
    title: '某金融科技公司上市暂缓',
    desc: '期权一夜之间变成了纸面数字，园区中介开始降价挂房。',
    effects: [{ kind: 'priceDelta', regionId: 'weilaikejicheng', amount: -30 }],
  },
  {
    id: 'ev202105',
    year: 2021,
    month: 5,
    title: '楼市到达周期顶点',
    desc: '所有人都在讨论「还涨多少」，没人讨论「会不会跌」。',
    effects: [{ kind: 'priceDelta', regionId: 'all', amount: 30 }],
  },
  {
    id: 'ev202108',
    year: 2021,
    month: 8,
    title: '新政与二手房指导价',
    desc: '挂牌价第一次有了官方参考值。',
    effects: [{ kind: 'policy', amount: 0, policyId: 'xianJia' }],
  },
  {
    id: 'ev202111',
    year: 2021,
    month: 11,
    title: '某板块代持风波',
    desc: '借名买房的人发现，合同上的名字不是自己的。',
    effects: [{ kind: 'policy', amount: 0, duration: 3, policyId: 'dongJie' }],
  },
  {
    id: 'ev202205',
    year: 2022,
    month: 5,
    title: '某板块停工与交付风险',
    desc: '塔吊停了，业主开始自己学着看工程进度表。',
    effects: [{ kind: 'heatDelta', regionId: 'all', amount: -10 }],
  },
  {
    id: 'ev202209',
    year: 2022,
    month: 9,
    title: '亚运延期',
    desc: '准备好的烟花，推迟了一年。',
    effects: [{ kind: 'priceDelta', regionId: 'qianjiangshijicheng', amount: -25 }],
  },
  {
    id: 'ev202309a',
    year: 2023,
    month: 9,
    title: '亚运会举办',
    desc: '全城放假三天，所有人都成了这座城市的导游。',
    effects: [
      { kind: 'priceDelta', regionId: 'qianjiangshijicheng', amount: 40 },
      { kind: 'heatDelta', regionId: 'all', amount: 10 },
    ],
  },
  {
    id: 'ev202309b',
    year: 2023,
    month: 9,
    title: '认房不认贷',
    desc: '改善置换的第一道门槛被拆掉了。',
    effects: [{ kind: 'priceDelta', regionId: 'all', amount: 12 }],
  },
  {
    id: 'ev202405',
    year: 2024,
    month: 5,
    title: '全面取消限购',
    desc: '外地号牌的车第一次排满了售楼处的停车场。',
    effects: [{ kind: 'priceDelta', regionId: 'all', amount: 15 }],
  },
  {
    id: 'ev202409',
    year: 2024,
    month: 9,
    title: '以旧换新与收储',
    desc: '老房子终于找到了买家——收购方是国企。',
    effects: [
      { kind: 'priceDelta', regionId: 'chengbei', amount: 10 },
      { kind: 'priceDelta', regionId: 'chengdong', amount: 10 },
    ],
  },
  {
    id: 'ev202502',
    year: 2025,
    month: 2,
    title: 'AI 企业出圈，产业叙事切换',
    desc: '算力、模型、园区——新的故事需要新的地。',
    effects: [
      { kind: 'heatDelta', regionId: 'weilaikejicheng', amount: 25 },
      { kind: 'heatDelta', regionId: 'binjiang', amount: 25 },
    ],
  },
  {
    id: 'ev202508',
    year: 2025,
    month: 8,
    title: '市场分化加剧',
    desc: '同一个城市，两条完全相反的曲线。',
    effects: [{ kind: 'heatDelta', regionId: 'all', amount: -15 }],
  },
  {
    id: 'ev202606',
    year: 2026,
    month: 6,
    title: '未知事件（随机池）',
    desc: '最后一个十年从不确定开始，也从不确定结束。',
    effects: [{ kind: 'heatDelta', regionId: 'all', amount: 0 }],
  },
];

/** 政策卡（5.4），由历史事件到期タスク启用与失效。 */
export const POLICIES: PolicyConfig[] = [
  {
    id: 'xianGou',
    name: '限购',
    desc: '持有 ≥2 套者不可再买地，持续 12 回合',
    maxTiles: 2,
  },
  {
    id: 'xianDai',
    name: '限贷',
    desc: '贷款额度上限降至净资产 40%',
    loanLimitRatio: 0.4,
  },
  {
    id: 'xianShou',
    name: '限售',
    desc: '卖出折价 20%，持有 <3 回合不可卖',
    sellDiscount: 0.2,
    minHoldTurns: 3,
  },
  {
    id: 'yaoHao',
    name: '摇号',
    desc: '买地改为摇号，中签率随热度下降',
    freezeBuy: false,
  },
  {
    id: 'xianJia',
    name: '限价',
    desc: '卖出收益封顶，超出部分归零',
    sellDiscount: 0.35,
  },
  {
    id: 'dongJie',
    name: '冻结',
    desc: '随机板块交易冻结 3 回合；冻结期间成本照付',
    freezeBuy: true,
  },
];

/** 机会卡池（5.3 节选，25 张设计量，本表为 M1 可玩子集并按设计值扩展）。 */
export const CHANCE_CARDS: CardConfig[] = [
  { id: 'c01', kind: 'chance', title: '老房拆迁', desc: '祖宅拆迁补偿到账。', effect: { t: 'cash', amount: 120 } },
  { id: 'c02', kind: 'chance', title: '年终奖', desc: '公司发了六个月的奖金。', effect: { t: 'cashByAssets', ratio: 0.05 } },
  { id: 'c03', kind: 'chance', title: '地铁规划公示', desc: '城东板块热度 +15。', effect: { t: 'heat', regionId: 'chengdong', delta: 15 } },
  { id: 'c04', kind: 'chance', title: '朋友给了房源', desc: '获得一张路障。', effect: { t: 'item', item: 'barrier' } },
  { id: 'c05', kind: 'chance', title: '中介请喝茶', desc: '获得一张遥控骰子。', effect: { t: 'item', item: 'remoteDice' } },
  { id: 'c06', kind: 'chance', title: '装修队进场', desc: '随机一块自有地块升一级。', effect: { t: 'upgradeRandom' } },
  { id: 'c07', kind: 'chance', title: '周末看房团', desc: '前进 3 格。', effect: { t: 'moveSteps', steps: 3 } },
  { id: 'c08', kind: 'chance', title: '房租暴涨', desc: '每块持有地块的业主各收一笔。 ', effect: { t: 'cashPerTile', amount: 15 } },
  { id: 'c09', kind: 'chance', title: '公积金提取', desc: '按资产比例获得现金。', effect: { t: 'cashByAssets', ratio: 0.04 } },
  { id: 'c10', kind: 'chance', title: '限购前的最后一班车', desc: '滨江热度 +12。', effect: { t: 'heat', regionId: 'binjiang', delta: 12 } },
  { id: 'c11', kind: 'chance', title: '网红包子铺', desc: '获得一张停留卡。', effect: { t: 'item', item: 'stay' } },
  { id: 'c12', kind: 'chance', title: '错过班车', desc: '回到起点。', effect: { t: 'moveTo', target: 'start' } },
];

/** 命运卡池（5.3）。 */
export const DESTINY_CARDS: CardConfig[] = [
  { id: 'd01', kind: 'destiny', title: '房屋维修', desc: '按持有地块数支付维修费。', effect: { t: 'cashPerTile', amount: -12 } },
  { id: 'd02', kind: 'destiny', title: '贷款利率上浮', desc: '支付一笔利息。', effect: { t: 'cash', amount: -60 } },
  { id: 'd03', kind: 'destiny', title: '楼市降温', desc: '城西热度 −12。', effect: { t: 'heat', regionId: 'chengxi', delta: -12 } },
  { id: 'd04', kind: 'destiny', title: '朋友借钱', desc: '付出一笔现金。', effect: { t: 'cash', amount: -80 } },
  { id: 'd05', kind: 'destiny', title: '样板间开放', desc: '西湖边热度 +8。', effect: { t: 'heat', regionId: 'xihubian', delta: 8 } },
  { id: 'd06', kind: 'destiny', title: '市场传言', desc: '城北热度 −10。', effect: { t: 'heat', regionId: 'chengbei', delta: -10 } },
  { id: 'd07', kind: 'destiny', title: '物业催缴', desc: '按持有地块数支付物业费。', effect: { t: 'cashPerTile', amount: -8 } },
  { id: 'd08', kind: 'destiny', title: '房东大会', desc: '最富有者向其余人分红。', effect: { t: 'transferFromRichest', ratio: 0.05 } },
  { id: 'd09', kind: 'destiny', title: '税务局核查', desc: '支付一笔现金。', effect: { t: 'cash', amount: -50 } },
  { id: 'd10', kind: 'destiny', title: '遗迹保护', desc: '获得一张掉头卡。', effect: { t: 'item', item: 'uTurn' } },
  { id: 'd11', kind: 'destiny', title: '钱塘观潮', desc: '前往风景区度假。', effect: { t: 'moveTo', target: 'scenic' } },
  { id: 'd12', kind: 'destiny', title: '厂房改造', desc: '随机自有地块升一级。', effect: { t: 'upgradeRandom' } },
];

/** 卡池抽样时的两类卡；每局按 CFG.cardPoolSize 抽样，见 engine/state.ts。 */
export const CARD_POOL_KINDS = ['chance', 'destiny'] as const;

/**
 * 文案表（10.3 需要导出的「文案表」）。
 * 合规要求（13.1）：负面事件一律写「某板块」，
 * 不对政策做价值判断，不出现真实企业与人物名称。
 */
export const TEXTS = {
  title: '杭州大富翁',
  subtitle: '2010—2026，一轮杭州楼市',
  disclaimer: '本游戏为虚构作品，所涉历史价格、涨跌幅与地块数值均为游戏设定，不构成任何投资建议。',
  startGame: '开始游戏',
  continueGame: '继续游戏',
  selectRole: '选择角色',
  selectChapter: '选择章节',
  startChapter: '进入本章',
  rollDice: '掷骰',
  buy: '买地',
  upgrade: '升级',
  sell: '卖地',
  loan: '贷款',
  repay: '还款',
  useSkill: '技能',
  endTurn: '结束回合',
  skip: '跳过',
  backToLatest: '回到最新',
  checkpointTitle: '期中小结',
  resultTitle: '时代总结',
  shareCard: '生成战报卡片',
  rankHint: '你相当于在杭州买了 {n} 套房',
  newbieProtectHint: '前 5 分钟不会出现任何插屏广告',
  privacyShort: '隐私政策与服务条款',
  versionLabel: '版本',
  networth: '净资产',
  cash: '现金',
  debt: '负债',
  property: '房产',
  securities: '持股',
  heat: '板块热度',
  monthly: '月净现金流',
  leverage: '杠杆率',
  toll: '过路费',
  rent: '月租金',
  unknown: '未知',
  vacantHint: '热度不足，租金按 {rate} 折算',
  adjacencyHint: '连片地块，过路费 ×2',
  jailHint: '关押中：掷出偶数即可离开，第 4 个回合强制释放',
  scenicHint: '度假中：剩余 {n} 个回合',
  liquidityHint: '清算期：还剩 {n} 个月',
} as const;

/** 日志语义色（9.4）：收入绿 / 支出红 / 事件青 / 政策红 / 系统灰。 */
export const LOG_STYLE = {
  income: { color: '#2FA36B', prefix: '收入' },
  expense: { color: '#D93A2B', prefix: '支出' },
  event: { color: '#4EC5D6', prefix: '事件' },
  policy: { color: '#D93A2B', prefix: '政策' },
  system: { color: '#9AA5B1', prefix: '系统' },
} as const;

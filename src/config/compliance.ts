/**
 * 合规自检元数据（13.1 内容与知识产权合规 + A18）。
 *
 * 硬性要求：
 *  - 地块只用真实地名 / 路名 / 功能名，不使用在售楼盘案名；
 *  - 建筑只借体量与气质，轮廓与配色均偏移，不复刻具体立面；
 *  - 企业统一用「某电商巨头」「某头部房企」等代称；
 *  - 负面事件一律写「某板块」，由系统随机绑定；
 *  - 棋盘底图为艺术化示意：不画行政区划边界、不标经纬度、不按真实比例（规避地图送审）。
 */
export const COMPLIANCE = {
  /** A18 门禁：非 true 时构建失败。 */
  complianceChecked: true,
  /** 免责声明固定文案。 */
  disclaimer: '本游戏为虚构作品，所涉历史价格、涨跌幅与地块数值均为游戏设定，不构成任何投资建议。',
  /** 底图必须为非地理精确的艺术化示意。 */
  boardSchematicOnly: true,
  /** 负面事件的板块必须匿名化。 */
  negativeEventsAnonymized: true,
  /** 禁止出现在文案中的真实企业名样例（用于 lint 式扫描）。 */
  forbiddenTokens: [
    '万达',
    '万科',
    '绿城中国',
    '阿里巴巴',
    '融创',
    '恒大',
    '碧桂园',
  ],
  /** 由系统会随机绑定的「某板块」代称。 */
  anonymousRegionAlias: '某板块',
  reviewedAt: '2026-10-31',
  reviewer: 'hangzhou-tycoon/pipeline',
} as const;

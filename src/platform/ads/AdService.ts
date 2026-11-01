/**
 * 广告统一接口（11.6 / D11）。
 *
 * 业务层永远只依赖这个接口：M1 使用 Mock 实现，M2.5 接入 Google H5 Games Ads，
 * 境内版再换穿山甲/优量汇——游戏代码一行不改。
 */

/** 广告位（11.2）：四个激励视频 + 章节插屏 + 冷启动插屏。 */
export type AdPlacementId =
  | 'revive'
  | 'doubleRent'
  | 'intel'
  | 'resultBonus'
  | 'chapterInterstitial'
  | 'coldStart';

export type AdResult = 'completed' | 'skipped' | 'failed';

export interface AdService {
  preload(placement: AdPlacementId): void;
  show(placement: AdPlacementId): Promise<AdResult>;
  /** 该广告位当前是否可用（受频次上限与加载状态限制）。 */
  available(placement: AdPlacementId): boolean;
}

/** 频次上限（11.3）：激励 4 次 / 插屏 2 次，合计 6 次；前 5 分钟不开屏。 */
export const AD_CAPS = {
  rewardedPerChapter: 4,
  interstitialPerChapter: 2,
  totalPerChapter: 6,
  interstitialMinIntervalMs: 5 * 60 * 1000,
  newcomerProtectionMs: 5 * 60 * 1000,
} as const;

/** 决策流程中禁止插广告（11.3 硬红线）。 */
export const DECISION_PHASES = ['decision', 'landing'] as const;

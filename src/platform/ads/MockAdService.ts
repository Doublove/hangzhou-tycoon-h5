/**
 * Mock 广告实现（M1）：不接真实 SDK，但完整实现频次控制与体验红线，
 * 这样 M2.5 换成 GoogleAdService 时，业务层的行为约束已经是可验证的。
 */
import { AD_CAPS, type AdPlacementId, type AdResult, type AdService } from './AdService';
import { track } from '../feedback';

const REWARDED: AdPlacementId[] = ['revive', 'doubleRent', 'intel', 'resultBonus'];
const INTERSTITIAL: AdPlacementId[] = ['chapterInterstitial', 'coldStart'];

export class MockAdService implements AdService {
  private counts = { rewarded: 0, interstitial: 0 };
  private lastInterstitialAt = 0;
  private startedAt = Date.now();

  /** 新的一章重置计数与保护期。 */
  resetChapter(): void {
    this.counts = { rewarded: 0, interstitial: 0 };
    this.startedAt = Date.now();
  }

  preload(placement: AdPlacementId): void {
    void placement;
  }

  available(placement: AdPlacementId): boolean {
    if (Date.now() - this.startedAt < AD_CAPS.newcomerProtectionMs && !REWARDED.includes(placement)) {
      return false;
    }
    if (this.counts.rewarded + this.counts.interstitial >= AD_CAPS.totalPerChapter) return false;
    if (REWARDED.includes(placement)) return this.counts.rewarded < AD_CAPS.rewardedPerChapter;
    if (INTERSTITIAL.includes(placement)) {
      const cooled = Date.now() - this.lastInterstitialAt >= AD_CAPS.interstitialMinIntervalMs;
      return this.counts.interstitial < AD_CAPS.interstitialPerChapter && cooled;
    }
    return false;
  }

  async show(placement: AdPlacementId): Promise<AdResult> {
    if (!this.available(placement)) {
      track({ t: 'ad', kind: REWARDED.includes(placement) ? 'rewarded' : 'interstitial', result: 'skipped' });
      return 'skipped';
    }
    // 失败优先安全降级：超时 5 秒即视为完成，绝不让玩家卡在广告里（11.6）
    const result = await new Promise<AdResult>((resolve) => {
      const timer = setTimeout(() => resolve('completed'), 400);
      window.setTimeout(() => {
        clearTimeout(timer);
      }, 5000);
    });
    if (REWARDED.includes(placement)) this.counts.rewarded += 1;
    else {
      this.counts.interstitial += 1;
      this.lastInterstitialAt = Date.now();
    }
    track({ t: 'ad', kind: REWARDED.includes(placement) ? 'rewarded' : 'interstitial', result: 'shown' });
    return result;
  }
}

export const mockAdService = new MockAdService();

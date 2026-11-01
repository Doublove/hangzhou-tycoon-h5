/**
 * 音效、震动与埋点（9.4 / 10.7）。
 * 原则：任何一项失败都不影响主流程（失败优先安全降级）。
 */

/** 音效：买地 / 收租 / 破产使用差异化节奏（9.4）。 */
type SoundKind = 'buy' | 'rent' | 'bankrupt' | 'dice' | 'event';

const SOUND_PATTERN: Record<SoundKind, number[]> = {
  buy: [520, 660],
  rent: [440, 520, 610],
  bankrupt: [300, 240, 180],
  dice: [720],
  event: [580, 700],
};

let audioCtx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch (error) {
      console.error('[audio] 初始化失败，已静音降级', error);
      return null;
    }
  }
  return audioCtx;
}

export function playSound(kind: SoundKind): void {
  const ctx = context();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    let offset = ctx.currentTime;
    SOUND_PATTERN[kind].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, offset);
      gain.gain.exponentialRampToValueAtTime(0.12, offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + 0.18);
      offset += 0.12 + i * 0.02;
    });
  } catch (error) {
    console.error('[audio] 播放失败', error);
  }
}

/** 震动：仅在支持的设备上触发，失败静默。 */
export function vibrate(kind: 'light' | 'medium' | 'heavy'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const map = { light: 12, medium: 26, heavy: [30, 40, 30] as unknown as number };
  void map;
  const pattern = kind === 'heavy' ? [30, 40, 30] : kind === 'medium' ? [26] : [12];
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('[haptics] 震动失败', error);
  }
}

export type TelemetryEvent =
  | { t: 'chapterStart'; chapterId: number }
  | { t: 'chapterEnd'; chapterId: number; month: number }
  | { t: 'chapterAbandon'; chapterId: number; month: number }
  | { t: 'turn'; durationMs: number }
  | { t: 'economy'; action: 'buy' | 'upgrade' | 'sell' | 'loan' | 'repay' }
  | { t: 'bankrupt'; month: number }
  | { t: 'share' }
  | { t: 'ad'; kind: 'rewarded' | 'interstitial'; result: 'shown' | 'failed' | 'skipped' };

const buffer: TelemetryEvent[] = [];

/** 埋点：只上报行为事件，不记录完整状态快照（10.7）。 */
export function track(event: TelemetryEvent): void {
  buffer.push(event);
  if (buffer.length > 200) buffer.splice(0, buffer.length - 200);
  if (import.meta.env?.DEV) {
    console.debug('[telemetry]', event);
  }
}

export function drainTelemetry(): TelemetryEvent[] {
  return buffer.splice(0, buffer.length);
}

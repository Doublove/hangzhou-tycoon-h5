/**
 * 启动页（P0）：3 秒内出现可交互的「开始游戏」，免登录、无启动器（9.3）。
 */
import { COMPLIANCE, TEXTS } from '@/config';
import { listSaves } from '@/platform/storage';

interface Props {
  onStart: () => void;
  onContinue: () => void;
  hasSave: boolean;
}

export function LaunchScreen({ onStart, onContinue, hasSave }: Props) {
  const saves = listSaves();
  const auto = saves[0];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-westlake/20 to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-2 text-game-xs uppercase tracking-[0.4em] text-westlake">2010 — 2026</div>
          <h1 className="text-game-2xl font-bold tracking-tight text-foreground">{TEXTS.title}</h1>
          <p className="mt-2 text-game-sm text-muted-foreground">{TEXTS.subtitle}</p>
        </div>

        <div className="panel animate-slide-up p-5">
          <button
            type="button"
            onClick={onStart}
            className="btn-brass h-14 w-full text-game-xl"
          >
            {TEXTS.startGame}
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!hasSave}
            className="mt-3 h-12 w-full rounded-sm border border-white/15 bg-ink-600 text-game-base text-foreground transition-colors hover:bg-ink-500 disabled:opacity-40"
          >
            {hasSave ? `${TEXTS.continueGame}（${auto ? `第 ${auto.chapterId} 章 · 第 ${auto.month + 1} 月` : ''}）` : '暂无存档'}
          </button>

          <div className="mt-5 space-y-2 text-game-xs leading-relaxed text-muted-foreground">
            <p>{COMPLIANCE.disclaimer}</p>
            <p>棋盘底图为艺术化示意，不画行政边界、不标经纬度。</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-game-xs text-muted-foreground">
          <span>
            {TEXTS.versionLabel} v0.1.0 · M1 垂直切片
          </span>
          <span className="flex gap-2">
            <a className="hover:text-foreground" href="./privacy.html">
              隐私政策
            </a>
            <span>·</span>
            <a className="hover:text-foreground" href="./terms.html">
              服务条款
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

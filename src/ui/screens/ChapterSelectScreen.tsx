/**
 * 章节选择（P0）：时间轴形式的章节地图（9.3 / 2.3）。
 * M1 只开放第一章，其余标注「后续版本」。
 */
import { CHAPTERS, MVP_CHAPTERS } from '@/config';

interface Props {
  onPick: (chapterId: number) => void;
  onBack: () => void;
}

export function ChapterSelectScreen({ onPick, onBack }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-game-xl font-bold text-foreground">选择章节</h2>
          <p className="text-game-sm text-muted-foreground">每章一环，单章约 25 分钟，可随时中断续玩</p>
        </div>
        <button type="button" onClick={onBack} className="text-game-sm text-muted-foreground hover:text-foreground">
          返回
        </button>
      </header>

      <div className="relative pl-6">
        <span className="absolute left-1 top-2 bottom-2 w-px bg-gradient-to-b from-westlake via-qiantang to-asian" />
        <div className="space-y-3">
          {CHAPTERS.map((chapter) => {
            const open = MVP_CHAPTERS.includes(chapter.id);
            return (
              <button
                key={chapter.id}
                type="button"
                disabled={!open}
                onClick={() => onPick(chapter.id)}
                className="panel relative w-full p-4 text-left transition-colors hover:border-white/20 disabled:opacity-50"
              >
                <span className="absolute -left-[22px] top-5 h-2.5 w-2.5 rounded-full bg-westlake shadow-[0_0_0_3px_rgba(46,125,111,0.25)]" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-game-lg font-semibold text-foreground">
                    第 {chapter.id} 章 · {chapter.name}
                  </span>
                  <span className="tnum text-game-xs text-muted-foreground">
                    {chapter.startYear}.01 — {chapter.endYear}.12
                  </span>
                  <span className="tnum text-game-xs text-westlake">{chapter.turns} 回合</span>
                  {open ? (
                    <span className="rounded-sm border border-gold/40 px-1 text-game-xs text-gold">可玩</span>
                  ) : (
                    <span className="rounded-sm border border-white/10 px-1 text-game-xs text-muted-foreground">
                      后续版本
                    </span>
                  )}
                </div>
                <p className="mt-1 text-game-sm text-muted-foreground">{chapter.theme}</p>
                <p className="mt-1 text-game-xs text-textDim">
                  时代目标净资产 {chapter.targetNetworth} 万 · 单章约 20—25 分钟
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

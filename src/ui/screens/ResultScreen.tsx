/**
 * 结算与战报（P0）：净资产曲线 + S/A/B/C 评价 + 「相当于买了几套房」趣味换算（2.4 / 9.3）。
 */
import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GameState } from '@/engine/state';
import { netWorth } from '@/engine/rules/economy';
import { RANK_THRESHOLDS, HOUSE_UNIT_PRICE, CHAPTER_MAP, CFG } from '@/config';
import { ROLE_MAP, THEME_SEATS } from '@/ui/constants';
import { track } from '@/platform/feedback';

interface Props {
  state: GameState;
  history: Array<{ month: number; worth: number[] }>;
  onRestart: () => void;
  onHome: () => void;
}

export function ResultScreen({ state, history, onRestart, onHome }: Props) {
  const chapter = CHAPTER_MAP[state.chapterId];
  const worths = state.players.map((p) => netWorth(state, p.seat));
  const best = Math.max(...worths);
  const humanWorth = worths[0];
  const ratio = best > 0 ? humanWorth / best : 0;
  const rank = RANK_THRESHOLDS.find((r) => ratio >= r.minRatio)?.rank ?? 'C';
  const houses = Math.max(0, Math.round(humanWorth / HOUSE_UNIT_PRICE));

  const data = useMemo(
    () =>
      history.map((point) => ({
        month: point.month,
        you: point.worth[0],
        ai1: point.worth[1],
        ai2: point.worth[2],
        ai3: point.worth[3],
      })),
    [history],
  );

  const ranked = state.players
    .map((p) => ({ seat: p.seat, name: ROLE_MAP[p.roleId]?.name ?? p.roleId, worth: netWorth(state, p.seat) }))
    .sort((a, b) => b.worth - a.worth);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-8">
      <div className="panel overflow-hidden">
        <div className="panel-title">
          <span>时代总结</span>
          <span className="ml-auto text-game-xs normal-case tracking-normal">
            第 {state.chapterId} 章 · {chapter.name}
          </span>
        </div>

        <div className="flex items-center gap-4 p-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-gold/50 bg-gold/10 text-game-2xl font-bold text-gold">
            {rank}
          </div>
          <div>
            <div className="text-game-sm text-muted-foreground">你的净资产</div>
            <div className="tnum text-game-xl font-semibold text-foreground">{humanWorth.toFixed(0)} 万</div>
            <div className="text-game-xs text-westlake">
              相当于在杭州买了 {houses} 套房（按 {HOUSE_UNIT_PRICE} 万/套换算）
            </div>
          </div>
        </div>

        <div className="h-48 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <XAxis dataKey="month" stroke="#9AA5B1" fontSize={11} />
              <YAxis stroke="#9AA5B1" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1A1F26', border: '1px solid rgba(255,255,255,0.1)' }}
                labelFormatter={(v) => `第 ${v} 月`}
              />
              <Line type="monotone" dataKey="you" stroke={THEME_SEATS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ai1" stroke={THEME_SEATS[1]} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="ai2" stroke={THEME_SEATS[2]} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="ai3" stroke={THEME_SEATS[3]} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1 border-t border-white/5 p-4">
          {ranked.map((row, index) => (
            <div key={row.seat} className="flex items-center gap-2 text-game-sm">
              <span className="w-5 text-muted-foreground">#{index + 1}</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: THEME_SEATS[row.seat % THEME_SEATS.length] }}
              />
              <span className="flex-1 text-foreground">{row.name}</span>
              <span className="tnum text-foreground">{row.worth.toFixed(0)} 万</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/5 p-4 text-game-xs">
          <div>
            <div className="text-muted-foreground">系统注入</div>
            <div className="tnum text-foreground">{state.flow.injection.toFixed(0)} 万</div>
          </div>
          <div>
            <div className="text-muted-foreground">玩家间转移</div>
            <div className="tnum text-foreground">{state.flow.transfer.toFixed(0)} 万</div>
          </div>
          <div className="col-span-2 text-muted-foreground">
            比值 {(state.flow.transfer > 0 ? state.flow.injection / state.flow.transfer : 0).toFixed(2)} : 1（红线 ≤{' '}
            {CFG.maxInjectionTransferRatio} : 1）
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => {
            track({ t: 'share' });
            navigator.clipboard?.writeText(
              `我在《杭州大富翁》第 ${state.chapterId} 章拿到 ${rank} 评价，净资产 ${humanWorth.toFixed(0)} 万，相当于买了 ${houses} 套房。`,
            );
          }}
          className="h-12 flex-1 rounded-sm border border-white/15 bg-ink-600 text-game-sm text-foreground hover:bg-ink-500"
        >
          复制战报
        </button>
        <button type="button" onClick={onRestart} className="btn-brass h-12 flex-1 text-game-base">
          再玩一次
        </button>
        <button
          type="button"
          onClick={onHome}
          className="h-12 rounded-sm border border-white/15 bg-ink-600 px-4 text-game-sm text-foreground hover:bg-ink-500"
        >
          回首页
        </button>
      </div>
    </div>
  );
}

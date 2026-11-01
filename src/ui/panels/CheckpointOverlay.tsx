/**
 * 期中小结（2.3）：每 8—12 回合插入一次，3 秒显示净资产变化与当前排名，
 * 同时作为自动存档点；玩家可以不点，3 秒后自动推进。
 */
import { useEffect, useState } from 'react';
import type { GameState } from '@/engine/state';
import { netWorth } from '@/engine/rules/economy';
import { ROLE_MAP, THEME_SEATS } from '@/ui/constants';
import { CFG } from '@/config';

const AUTO_CLOSE_MS = 3000;

interface Props {
  state: GameState;
  onClose: () => void;
}

export function CheckpointOverlay({ state, onClose }: Props) {
  const [left, setLeft] = useState(Math.ceil(AUTO_CLOSE_MS / 1000));

  useEffect(() => {
    const tick = window.setInterval(() => setLeft((v) => v - 1), 1000);
    const close = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(close);
    };
  }, [onClose]);

  const ranked = state.players
    .map((p) => ({ seat: p.seat, name: ROLE_MAP[p.roleId]?.name ?? p.roleId, worth: netWorth(state, p.seat) }))
    .sort((a, b) => b.worth - a.worth);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
      <div className="panel w-full max-w-sm animate-pop-in p-5">
        <div className="flex items-center justify-between">
          <span className="text-game-base font-semibold text-foreground">期中小结</span>
          <span className="tnum text-game-xs text-muted-foreground">{left}s 后自动关闭</span>
        </div>
        <div className="mt-3 space-y-1">
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
        <p className="mt-3 text-game-xs text-muted-foreground">
          已自动存档，随时可以退出重进（每 {CFG.checkpointEveryTurns} 回合一次）。
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-sm border border-white/15 bg-ink-600 text-game-sm text-foreground"
        >
          继续
        </button>
      </div>
    </div>
  );
}

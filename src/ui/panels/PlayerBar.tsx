/**
 * 玩家栏：按净资产实时排名，每人分列 现金 / 负债 / 房产 / 持股（9.2）。
 */
import { useMemo } from 'react';
import type { SeatIndex } from '@/types';
import { ROLE_MAP, THEME_SEATS } from '@/ui/constants';
import type { GameState } from '@/engine/state';
import { netWorth, tileValue, securitiesValue, leverageOf } from '@/engine/rules/economy';

interface Props {
  state: GameState;
  activeSeat: SeatIndex;
}

export function PlayerBar({ state, activeSeat }: Props) {
  const rows = useMemo(() => {
    return state.players
      .map((player) => {
        const property = Object.values(state.tiles)
          .filter((t) => t.owner === player.seat)
          .reduce((sum, t) => sum + tileValue(state, t.id), 0);
        return {
          seat: player.seat,
          roleId: player.roleId,
          human: player.human,
          bankrupt: player.bankrupt,
          cash: player.cash,
          debt: player.debt,
          property,
          securities: securitiesValue(state, player.seat),
          worth: netWorth(state, player.seat),
          leverage: leverageOf(state, player.seat),
        };
      })
      .sort((a, b) => b.worth - a.worth);
  }, [state]);

  return (
    <div className="panel overflow-hidden">
      <div className="panel-title">
        <span>玩家</span>
        <span className="ml-auto text-game-xs normal-case tracking-normal">按净资产排名</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row, index) => {
          const role = ROLE_MAP[row.roleId];
          const isActive = row.seat === activeSeat;
          return (
            <div
              key={row.seat}
              className={`grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-2 px-3 py-2 transition-colors ${
                isActive ? 'bg-gold/10' : ''
              }`}
            >
              <div className="flex min-w-[104px] items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: THEME_SEATS[row.seat % THEME_SEATS.length] }}
                />
                <div className="leading-tight">
                  <div className="text-game-sm font-semibold text-foreground">
                    {role?.name ?? row.roleId}
                    {row.human ? <span className="ml-1 text-game-xs text-gold">你</span> : null}
                    {row.bankrupt ? <span className="ml-1 text-game-xs text-loss">出局</span> : null}
                  </div>
                  <div className="tnum text-game-xs text-muted-foreground">
                    #{index + 1} · 杠杆 {(row.leverage * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <Metric label="现金" value={row.cash} tone={row.cash < 0 ? 'loss' : 'default'} />
              <Metric label="负债" value={row.debt} tone={row.debt > 0 ? 'warn' : 'default'} />
              <Metric label="房产" value={row.property} />
              <Metric label="持股" value={row.securities} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'loss' | 'warn' }) {
  const color = tone === 'loss' ? 'text-loss' : tone === 'warn' ? 'text-gold' : 'text-foreground';
  return (
    <div className="leading-tight">
      <div className="text-game-xs text-muted-foreground">{label}</div>
      <div className={`tnum text-game-sm ${color}`}>{value.toFixed(0)}</div>
    </div>
  );
}

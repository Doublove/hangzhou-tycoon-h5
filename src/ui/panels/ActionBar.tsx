/**
 * 底部操作区：掷骰按钮（聚宝盆质感）+ 快捷操作 + 手牌 + 技能按钮。
 * 买地前必须给出「买后现金 / 月现金流变化 / 杠杆率」后果预览（9.4）。
 */
import type { GameState } from '@/engine/state';
import { canBuy, canUpgrade, tileUnderFoot, type Command } from '@/engine/commands';
import { basePrice, monthlyFlow, tilePrice, upgradeCost, sellProceeds, leverageOf } from '@/engine/rules/economy';
import { ROLE_MAP, THEME_SEATS } from '@/ui/constants';
import { TILE_MAP } from '@/config';
import { itemName } from '@/engine/rules/cards';

interface Props {
  state: GameState;
  awaiting: GameState['awaiting'];
  isHumanTurn: boolean;
  act: (command: Command) => void;
}

export function ActionBar({ state, awaiting, isHumanTurn, act }: Props) {
  const seat = state.activeSeat;
  const player = state.players[seat];
  const role = ROLE_MAP[player.roleId];
  const tileId = tileUnderFoot(state, seat);
  const disabled = !isHumanTurn;

  const price = tileId ? tilePrice(state, tileId) : 0;
  const buyable = Boolean(tileId && canBuy(state, seat, tileId));
  const upgradable = Boolean(tileId && canUpgrade(state, seat, tileId));
  const sellable = Boolean(tileId && state.tiles[tileId]?.owner === seat);
  const flow = monthlyFlow(state, seat);

  const cashAfterBuy = player.cash - price;
  const leverage = leverageOf(state, seat);
  const bookDelta = tileId ? price - basePrice(state, tileId) : 0;

  return (
    <div className="panel">
      <div className="flex flex-wrap items-stretch gap-2 p-3">
        {awaiting === 'roll' ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => act({ t: 'rollDice' })}
            className="btn-brass h-11 min-w-[112px] px-6 text-game-lg disabled:opacity-40"
          >
            掷骰
          </button>
        ) : (
          <div className="flex h-11 min-w-[112px] items-center justify-center rounded-sm border border-white/10 bg-ink-600 px-4 text-game-sm text-muted-foreground">
            {state.awaiting === 'decision' ? '等待决策' : '进行中…'}
          </div>
        )}

        <QuickAction
          label="买地"
          hint={`${price.toFixed(0)} 万`}
          disabled={disabled || !buyable}
          onClick={() => tileId && act({ t: 'buyTile' })}
        />
        <QuickAction
          label="升级"
          hint={tileId ? `${upgradeCost(state, tileId).toFixed(0)} 万` : '—'}
          disabled={disabled || !upgradable}
          onClick={() => tileId && act({ t: 'upgradeTile', tileId })}
        />
        <QuickAction
          label="卖地"
          hint={tileId ? `${sellProceeds(state, tileId, seat).toFixed(0)} 万` : '—'}
          disabled={disabled || !sellable}
          onClick={() => tileId && act({ t: 'sellTile', tileId })}
        />
        <QuickAction
          label="贷款"
          hint="20 万"
          disabled={disabled}
          onClick={() => act({ t: 'takeLoan', amount: 20 })}
        />
        <QuickAction
          label="还款"
          hint="20 万"
          disabled={disabled || player.debt <= 0}
          onClick={() => act({ t: 'repayLoan', amount: 20 })}
        />

        <button
          type="button"
          disabled={disabled || player.skillCooldown > 0}
          onClick={() => act({ t: 'useSkill' })}
          className="h-11 rounded-sm border border-cyan/40 bg-cyan/10 px-3 text-game-sm text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-40"
        >
          {role?.skill.name ?? '技能'}
          <span className="ml-1 tnum text-game-xs">
            {player.skillCooldown > 0 ? `冷却 ${player.skillCooldown}` : '可用'}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || awaiting !== 'decision'}
          onClick={() => act({ t: 'endDecision' })}
          className="h-11 rounded-sm border border-white/15 bg-ink-600 px-4 text-game-sm text-foreground transition-colors hover:bg-ink-500 disabled:opacity-40"
        >
          结束回合
        </button>
      </div>

      {/* 后果预览：买地前必须显示（9.4） */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/5 px-3 py-2 text-game-xs sm:grid-cols-4">
        <Preview label="买后现金" value={`${cashAfterBuy.toFixed(0)} 万`} tone={cashAfterBuy < 0 ? 'loss' : 'default'} />
        <Preview label="月净现金流" value={`${flow.net.toFixed(1)} 万`} tone={flow.net < 0 ? 'warn' : 'default'} />
        <Preview label="杠杆率" value={`${(leverage * 100).toFixed(0)}%`} tone={leverage > 0.5 ? 'loss' : 'default'} />
        <Preview
          label="较基准价"
          value={`${bookDelta >= 0 ? '+' : ''}${bookDelta.toFixed(0)} 万`}
          tone={bookDelta > 0 ? 'warn' : 'default'}
        />
      </div>

      {/* 手牌（道具条，9.6） */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-3 py-2">
        <span className="text-game-xs uppercase tracking-widest text-muted-foreground">道具</span>
        {(Object.keys(player.items) as Array<keyof typeof player.items>).map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled || player.items[item] <= 0 || awaiting !== 'decision'}
            onClick={() => act({ t: 'useItem', item, arg: state.players[seat].position })}
            className="rounded-sm border border-white/10 bg-ink-600 px-2 py-1 text-game-xs text-foreground transition-colors hover:bg-ink-500 disabled:opacity-40"
          >
            {itemName(item)} ×{player.items[item]}
          </button>
        ))}
        {tileId ? (
          <span className="ml-auto text-game-xs text-muted-foreground">
            脚下地块：{TILE_MAP[tileId].name}
            <span className="ml-1" style={{ color: THEME_SEATS[seat] }}>
              · {TILE_MAP[tileId].regionId === 'xihubian' ? '西湖边' : ''}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function QuickAction({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 min-w-[84px] flex-col items-center justify-center rounded-sm border border-white/10 bg-ink-600 px-3 transition-colors hover:bg-ink-500 disabled:opacity-40"
    >
      <span className="text-game-sm text-foreground">{label}</span>
      <span className="tnum text-game-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function Preview({ label, value, tone }: { label: string; value: string; tone: 'default' | 'warn' | 'loss' }) {
  const color = tone === 'loss' ? 'text-loss' : tone === 'warn' ? 'text-gold' : 'text-foreground';
  return (
    <div className="leading-tight">
      <div className="text-muted-foreground">{label}</div>
      <div className={`tnum ${color}`}>{value}</div>
    </div>
  );
}

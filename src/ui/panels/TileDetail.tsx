/**
 * 地块详情（P0）：地价、租金、等级、历史涨跌曲线与风物文案（9.3）。
 */
import { REGION_BY_ID, TILE_MAP } from '@/config';
import type { GameState } from '@/engine/state';
import { basePrice, monthlyRent, monthlyUpkeep, tilePrice, upgradeCost, vacancyFactor } from '@/engine/rules/economy';
import { isAdjacent } from '@/engine/rules/toll';

interface Props {
  state: GameState;
  tileId: string | null;
  onClose: () => void;
}

export function TileDetail({ state, tileId, onClose }: Props) {
  if (!tileId) {
    return (
      <div className="panel px-3 py-4 text-game-xs text-muted-foreground">
        点击右侧面板查看地块：地价、租金、等级与风物文案会显示在这里。
      </div>
    );
  }
  const cfg = TILE_MAP[tileId];
  const st = state.tiles[tileId];
  const region = REGION_BY_ID(cfg.regionId);
  const price = tilePrice(state, tileId);
  const base = basePrice(state, tileId);
  const heat = state.heat[cfg.regionId] ?? 50;
  const delta = base > 0 ? ((price - base) / base) * 100 : 0;
  const owner = st.owner !== null ? state.players[st.owner] : null;

  return (
    <div className="panel overflow-hidden">
      <div className="panel-title">
        <span>{cfg.name}</span>
        <span className="ml-auto text-game-xs normal-case tracking-normal" style={{ color: region.color }}>
          {region.name}
        </span>
        <button type="button" onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 text-game-xs">
        <Row label="当前地价" value={`${price.toFixed(0)} 万`} />
        <Row label="较基准" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`} tone={delta >= 0 ? 'gain' : 'loss'} />
        <Row label="月租金" value={`${monthlyRent(state, tileId).toFixed(2)} 万`} />
        <Row label="物业费" value={`${monthlyUpkeep(state, tileId).toFixed(2)} 万`} />
        <Row label="等级" value={`Lv${st.level} / ${Math.min(5, cfg.levelCap + st.levelCapBoost)}`} />
        <Row label="升级费" value={`${upgradeCost(state, tileId).toFixed(0)} 万`} />
        <Row label="板块热度" value={`${heat.toFixed(0)} / 100`} />
        <Row label="空置折算" value={`${(vacancyFactor(heat) * 100).toFixed(0)}%`} />
        <Row label="连片" value={isAdjacent(state, tileId) ? '是（×2）' : '否'} />
        <Row label="归属" value={owner ? `座位 ${owner.seat + 1}` : st.unlocked ? '无主' : '未挂牌'} />
      </div>
      <p className="border-t border-white/5 px-3 py-2 text-game-xs leading-relaxed text-muted-foreground">
        {cfg.flavor}
      </p>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  const color = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-foreground';
  return (
    <div className="leading-tight">
      <div className="text-muted-foreground">{label}</div>
      <div className={`tnum ${color}`}>{value}</div>
    </div>
  );
}

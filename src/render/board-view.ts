/**
 * 把引擎状态翻译成画布可读的纯数据（表现层只播放结果，不做数值计算，10.2）。
 */
import type { CellKind, SeatIndex } from '@/types';
import { REGION_BY_ID, TILE_MAP } from '@/config';
import type { GameState } from '@/engine/state';
import { isAdjacent } from '@/engine/rules/toll';
import { tilePrice } from '@/engine/rules/economy';
import { calendarOf } from '@/engine/state';
import { THEME } from './theme';

export interface CellView {
  index: number;
  kind: CellKind;
  name: string;
  owner: SeatIndex | null;
  level: number;
  unlocked: boolean;
  stalled: boolean;
  adjacency: boolean;
  price: number;
  regionColor: string;
  heat: number;
}

export interface PlayerView {
  seat: SeatIndex;
  name: string;
  position: number;
  color: string;
  bankrupt: boolean;
  jailed: boolean;
  piece: 'king' | 'queen' | 'rook' | 'knight';
}

export interface BoardView {
  cells: CellView[];
  players: PlayerView[];
  /** 位于监狱（棋盘中心）的玩家座位。 */
  jailed: SeatIndex[];
  yearLabel: string;
  monthIndex: number;
  chapterProgress: number;
}

const PIECES: Array<'king' | 'queen' | 'rook' | 'knight'> = ['king', 'queen', 'rook', 'knight'];

function roleName(state: GameState, seat: SeatIndex): string {
  return state.players[seat].roleId;
}

export function buildBoardView(state: GameState): BoardView {
  const cells: CellView[] = state.cells.map((cell) => {
    if (cell.kind === 'tile' && cell.tileId) {
      const cfg = TILE_MAP[cell.tileId];
      const st = state.tiles[cell.tileId];
      return {
        index: cell.index,
        kind: 'tile',
        name: cfg.name,
        owner: st.owner,
        level: st.level,
        unlocked: st.unlocked,
        stalled: st.stalled,
        adjacency: isAdjacent(state, cell.tileId),
        price: tilePrice(state, cell.tileId),
        regionColor: REGION_BY_ID(cfg.regionId).color,
        heat: state.heat[cfg.regionId] ?? 50,
      };
    }
    return {
      index: cell.index,
      kind: cell.kind,
      name: '',
      owner: null,
      level: 0,
      unlocked: true,
      stalled: false,
      adjacency: false,
      price: 0,
      regionColor: THEME.stoneDark,
      heat: 50,
    };
  });

  const cal = calendarOf(state);
  const chapter = state.chapterId;
  void chapter;

  return {
    cells,
    players: state.players.map((p) => ({
      seat: p.seat,
      name: roleName(state, p.seat),
      position: p.position,
      color: THEME.seatColors[p.seat % THEME.seatColors.length],
      bankrupt: p.bankrupt,
      jailed: p.jailTurns > 0,
      piece: PIECES[p.seat % PIECES.length],
    })),
    jailed: state.players.filter((p) => p.jailTurns > 0).map((p) => p.seat),
    yearLabel: `${cal.year}.${String(cal.month).padStart(2, '0')}`,
    monthIndex: state.month,
    chapterProgress: 0,
  };
}

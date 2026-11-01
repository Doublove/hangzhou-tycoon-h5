/**
 * 运行时状态：唯一的 GameState 定义、初始化与稳定哈希。
 *
 * 约束（10.2）：本文件属于逻辑层，禁止依赖 React / DOM / Canvas，
 * 因此可以被 Node 直接跑（Vitest 与 ?sim=1 批量模拟依赖这一点）。
 */
import type {
  BoardCell,
  CardConfig,
  DifficultyId,
  GameEvent,
  ItemKind,
  LogEntry,
  PersonalityId,
  PlayerState,
  SeatIndex,
  TileState,
} from '@/types';
import {
  CFG,
  CHANCE_CARDS,
  DESTINY_CARDS,
  CHAPTER_MAP,
  HISTORY_EVENTS,
  eraValueAtMonthOffset,
  bindTilesToRing,
  tilesOfRing,
  unlockOffsetOf,
  REGIONS,
  ROLE_MAP,
  ROLE_APPETITE,
} from '@/config';
import { createRng, shuffled, type RngState } from './rng';

/** 回合八阶段（2.2）。 */
export type TurnPhase =
  | 'monthStart'
  | 'broadcast'
  | 'roll'
  | 'move'
  | 'landing'
  | 'decision'
  | 'turnEnd'
  | 'monthEnd';

/** 等待输入的类型：非空串时调度器暂停，等待 UI/AI 下发命令。 */
export type AwaitKind = 'none' | 'roll' | 'landing' | 'decision' | 'cardAck' | 'gameOver';

/** 生效中的政策。 */
export interface ActivePolicy {
  id: string;
  /** 到期的绝对回合序号；-1 表示长期有效。 */
  expireTurn: number;
}

export interface PendingMove {
  from: number;
  steps: number;
  direction: 1 | -1;
  /** 已走过的步数（逐格动画用）。 */
  walked: number;
}

export interface FlowStats {
  /** 系统注入：起点月供 + 月租金（扣除空置率后的实收）。 */
  injection: number;
  /** 玩家间转移：过路费与法拍成交。 */
  transfer: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: RngState;
  chapterId: number;
  /** 月偏移：0 为章节首月。 */
  month: number;
  turn: number;
  activeSeat: SeatIndex;
  phase: TurnPhase;
  awaiting: AwaitKind;
  cells: BoardCell[];
  tiles: Record<string, TileState>;
  heat: Record<string, number>;
  players: PlayerState[];
  activePolicies: ActivePolicy[];
  /** 「冻结」政策随机绑定的板块（13.1：负面事件写「某板块」）。 */
  frozenRegion: string | null;
  /** 本回合需播报的历史事件 id（月初结算后写入）。 */
  pendingBroadcasts: string[];
  firedHistory: string[];
  pendingMove: PendingMove | null;
  /** 本局抽取后的卡池与其游标。 */
  deck: CardConfig[];
  deckCursor: number;
  log: LogEntry[];
  /** 资金流向统计（8.7）。 */
  flow: FlowStats;
  finished: boolean;
  rankNote: string | null;
  lastEvents: GameEvent[];
}

/** 一局的初始化选项。 */
export interface InitOptions {
  seed: number;
  chapterId: number;
  /** 人类选择的角色 id。 */
  roleId: string;
  /** AI 难度（三个 AI 共用一档，便于目标胜率校准）。 */
  difficulty: DifficultyId;
}

const PERSONALITY_BY_DIFFICULTY: Record<DifficultyId, PersonalityId[]> = {
  easy: ['follower', 'steady', 'speculative'],
  normal: ['steady', 'aggressive', 'follower'],
  hard: ['aggressive', 'speculative', 'aggressive'],
};

function emptyItems(): Record<ItemKind, number> {
  return { remoteDice: 0, stay: 0, uTurn: 0, barrier: 0 };
}

/** 创建初始状态。 */
export function createInitialState(options: InitOptions): GameState {
  const chapter = CHAPTER_MAP[options.chapterId];
  if (!chapter) {
    console.error(`[state] 未知章节：${options.chapterId}`);
  }
  const ringTiles = tilesOfRing(chapter.ring);
  const cells = bindTilesToRing(ringTiles.map((t) => t.id));

  const tiles: Record<string, TileState> = {};
  ringTiles.forEach((t) => {
    tiles[t.id] = {
      id: t.id,
      owner: null,
      level: 0,
      unlocked: unlockOffsetOf(t, chapter.startYear) === 0,
      priceBoost: 0,
      levelCapBoost: 0,
      stalled: false,
      heldTurns: 0,
      acquiredMonth: -1,
      barrierAt: null,
    };
  });

  const heat: Record<string, number> = {};
  REGIONS.forEach((r) => {
    heat[r.id] = r.baseHeat;
  });

  // 卡池：每局按 CARD_POOL_SIZE 抽样（V1.8）
  let rng = createRng(options.seed);
  const poolSource = [...CHANCE_CARDS, ...DESTINY_CARDS];
  const shuffledRes = shuffled(rng, 'card', poolSource);
  rng = shuffledRes.rng;
  const deck = shuffledRes.value.slice(0, CFG.cardPoolSize);

  // 角色分配：人类固定，其余从剩余角色中随机抽取（6.3）
  const remainingRoleIds = Object.keys(ROLE_MAP).filter((id) => id !== options.roleId);
  const rolePick = shuffled(rng, 'card', remainingRoleIds);
  rng = rolePick.rng;
  const aiRoleIds = rolePick.value.slice(0, 3);

  const eraFactor = eraValueAtMonthOffset((chapter.startYear - 2010) * 12);
  const personalities = PERSONALITY_BY_DIFFICULTY[options.difficulty];

  const players: PlayerState[] = ([options.roleId, ...aiRoleIds] as string[]).map((roleId, index) => {
    const role = ROLE_MAP[roleId];
    const appetite = ROLE_APPETITE[role.id as keyof typeof ROLE_APPETITE];
    const items = { ...emptyItems(), ...CFG.startItems } as Record<ItemKind, number>;
    if (role.id === 'wangzhongjie') {
      items.remoteDice = CFG.startItemsByRole.wangzhongjie.remoteDice;
    }
    return {
      seat: index as SeatIndex,
      roleId,
      cash: Math.round(role.cashBase * eraFactor),
      debt: 0,
      position: 0,
      direction: 1,
      bankrupt: false,
      liquidationStartMonth: -1,
      items,
      jailTurns: 0,
      jailAttempts: 0,
      scenicTurns: 0,
      skillCooldown: 0,
      pendingDiceBonus: 0,
      queuedDice: null,
      stayFlag: false,
      deathOnceUsed: false,
      securitiesLots: 0,
      securitiesCost: 0,
      human: index === 0,
      difficulty: options.difficulty,
      personality: personalities[index % personalities.length],
      levTarget: appetite.levTarget,
      sellAt: appetite.sellAt,
      buyThreshold: appetite.buyThreshold,
    } satisfies PlayerState;
  });

  const state: GameState = {
    version: 1,
    seed: options.seed,
    rng,
    chapterId: chapter.id,
    month: 0,
    turn: 0,
    activeSeat: 0,
    phase: 'monthStart',
    awaiting: 'none',
    cells,
    tiles,
    heat,
    players,
    activePolicies: [],
    frozenRegion: null,
    pendingBroadcasts: [],
    firedHistory: [],
    pendingMove: null,
    deck,
    deckCursor: 0,
    log: [],
    flow: { injection: 0, transfer: 0 },
    finished: false,
    rankNote: null,
    lastEvents: [],
  };

  pushLog(state, 0, null, 'system', `开局：${chapter.name}（${chapter.startYear}.01）`);
  return state;
}

/** 追加一条日志，保留最近 300 条（9.4）。 */
export function pushLog(
  state: GameState,
  month: number,
  seat: SeatIndex | null,
  kind: LogEntry['kind'],
  text: string,
): void {
  state.log.push({ month, seat, kind, text });
  if (state.log.length > 300) {
    state.log.splice(0, state.log.length - 300);
  }
}

/** 当前年月：{ year, month(1—12) }。 */
export function calendarOf(state: GameState): { year: number; month: number } {
  const chapter = CHAPTER_MAP[state.chapterId];
  const absolute = (chapter.startYear - 2010) * 12 + state.month;
  return { year: 2010 + Math.floor(absolute / 12), month: (absolute % 12) + 1 };
}

/** 该章应生效的历史事件列表（按绝对年月过滤，第四章含 2026 随机事件）。 */
export function chapterHistoryEvents(chapterId: number): typeof HISTORY_EVENTS {
  const chapter = CHAPTER_MAP[chapterId];
  return HISTORY_EVENTS.filter((e) => e.year >= chapter.startYear && e.year <= chapter.endYear);
}

/** 当前有效的政策 id 集合。 */
export function activePolicyIds(state: GameState): string[] {
  return state.activePolicies.map((p) => p.id);
}

/**
 * 稳定哈希：把状态序列化为「键排序后的纯数据」再做 FNV-1a。
 * 用途是 A17 的确定性校验，因此刻意排除 lastEvents / log 这类表现层字段。
 */
export function hashState(state: GameState): string {
  const payload = {
    version: state.version,
    seed: state.seed,
    chapterId: state.chapterId,
    month: state.month,
    turn: state.turn,
    activeSeat: state.activeSeat,
    phase: state.phase,
    awaiting: state.awaiting,
    rng: state.rng,
    tiles: sortedEntries(state.tiles),
    heat: sortedEntries(state.heat),
    players: state.players,
    activePolicies: state.activePolicies,
    deckCursor: state.deckCursor,
    flow: state.flow,
    finished: state.finished,
  };
  return fnv1a(JSON.stringify(payload));
}

function sortedEntries<T>(record: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  Object.keys(record)
    .sort()
    .forEach((k) => {
      out[k] = record[k];
    });
  return out;
}

export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // 组合两次不同种子的结果，降低短字符串碰撞概率
  let hash2 = 0x01000193;
  for (let i = input.length - 1; i >= 0; i -= 1) {
    hash2 ^= input.charCodeAt(i) + input.length;
    hash2 = Math.imul(hash2, 0x85ebca6b) >>> 0;
  }
  return `${hash.toString(16)}${hash2.toString(16)}`;
}

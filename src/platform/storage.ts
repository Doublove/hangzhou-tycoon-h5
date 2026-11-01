/**
 * 存档（10.4）：1 个自动存档位 + 3 个手动存档位，localStorage，单档 ≤ 200KB。
 * 存档带 version 字段与迁移脚本；损坏时降级为新档并提示，绝不白屏。
 */
import type { GameState } from '@/engine/state';

const PREFIX = 'hangzhou-tycoon';
export const SAVE_VERSION = 1;

export type SaveSlot = 'auto' | 'slot1' | 'slot2' | 'slot3';

export interface SaveMeta {
  slot: SaveSlot;
  version: number;
  savedAt: number;
  chapterId: number;
  month: number;
  seed: number;
}

export interface SaveRecord {
  meta: SaveMeta;
  state: GameState;
}

const keyOf = (slot: SaveSlot): string => `${PREFIX}:${slot}`;

/** 单档体积上限（10.4：≤ 200KB）。 */
const MAX_BYTES = 200 * 1024;

function storage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

/** 迁移：把旧版本存档补齐到当前结构；无法迁移时返回 null。 */
function migrate(record: SaveRecord): SaveRecord | null {
  if (!record || typeof record !== 'object' || !record.state) return null;
  const state = record.state as GameState;
  if (typeof state.version !== 'number') return null;
  if (state.version === SAVE_VERSION) return record;
  // 目前只有一个版本，未来在此追加逐级迁移
  if (state.version > SAVE_VERSION) return null;
  state.version = SAVE_VERSION;
  state.frozenRegion = state.frozenRegion ?? null;
  return { ...record, state, meta: { ...record.meta, version: SAVE_VERSION } };
}

export function saveGame(slot: SaveSlot, state: GameState): boolean {
  const store = storage();
  if (!store) return false;
  const record: SaveRecord = {
    meta: {
      slot,
      version: SAVE_VERSION,
      savedAt: Date.now(),
      chapterId: state.chapterId,
      month: state.month,
      seed: state.seed,
    },
    state,
  };
  try {
    const payload = JSON.stringify(record);
    if (payload.length > MAX_BYTES) {
      console.error(`[storage] 存档超出 200KB 上限（${payload.length} 字节）`);
      return false;
    }
    store.setItem(keyOf(slot), payload);
    return true;
  } catch (error) {
    console.error('[storage] 写入存档失败', error);
    return false;
  }
}

export function loadGame(slot: SaveSlot): SaveRecord | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(keyOf(slot));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveRecord;
    const migrated = migrate(parsed);
    if (!migrated) {
      console.error(`[storage] 存档 ${slot} 无法迁移，已忽略`);
      store.removeItem(keyOf(slot));
      return null;
    }
    return migrated;
  } catch (error) {
    console.error(`[storage] 存档 ${slot} 解析失败，已清理`, error);
    store.removeItem(keyOf(slot));
    return null;
  }
}

export function clearSlot(slot: SaveSlot): void {
  storage()?.removeItem(keyOf(slot));
}

export function listSaves(): Array<SaveMeta | null> {
  const slots: SaveSlot[] = ['auto', 'slot1', 'slot2', 'slot3'];
  return slots.map((slot) => {
    const record = loadGame(slot);
    return record ? record.meta : null;
  });
}

/** 每回合结束自动存档（断点续玩，10.4）。 */
export function autoSave(state: GameState): void {
  saveGame('auto', state);
}

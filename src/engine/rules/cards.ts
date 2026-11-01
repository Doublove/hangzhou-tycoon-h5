/**
 * 抽卡与功能格结算（第五章 / 3.10）。
 *
 * A15：机会格 35% 掉落道具；税务 13% 停留卡；买入指数 13% 掉头卡；监狱 5% 路障。
 * 停留卡（V1.5）：再次触发脚下地块——在自家地上可再升一级，在对手地上则要再付一次过路费。
 */
import type { CardConfig, GameEvent, ItemKind, SeatIndex } from '@/types';
import { CFG, REGIONS, TILE_MAP } from '@/config';
import { clampHeat, payToll, rollItemDrop } from '../commands';
import { pickOne } from '../rng';
import { advance } from '@/config';
import { activePolicyIds, pushLog, type GameState } from '../state';
import { monthlyFlow, netWorth, upgradeCost } from './economy';

/** 抽一张卡：卡池循环使用，游标推进。 */
export function drawCard(state: GameState, seat: SeatIndex, kind: 'chance' | 'destiny', events: GameEvent[]): CardConfig | null {
  if (state.deck.length === 0) return null;
  const startCursor = state.deckCursor;
  let card: CardConfig | null = null;
  for (let i = 0; i < state.deck.length; i += 1) {
    const candidate = state.deck[(startCursor + i) % state.deck.length];
    if (candidate.kind === kind) {
      card = candidate;
      state.deckCursor = (startCursor + i + 1) % state.deck.length;
      break;
    }
  }
  if (!card) {
    card = state.deck[startCursor % state.deck.length];
    state.deckCursor = (startCursor + 1) % state.deck.length;
  }
  events.push({ t: 'cardDrawn', seat, cardId: card.id, kind });
  pushLog(state, state.month, seat, 'event', `${card.title}：${card.desc}`);
  applyCardEffect(state, seat, card, events);
  return card;
}

/** 应用 cardEffect。 */
export function applyCardEffect(state: GameState, seat: SeatIndex, card: CardConfig, events: GameEvent[]): void {
  const player = state.players[seat];
  switch (card.effect.t) {
    case 'cash': {
      const amount = card.effect.amount;
      player.cash += amount;
      if (amount > 0) state.flow.injection += amount;
      break;
    }
    case 'cashByAssets': {
      const amount = Math.max(0, netWorth(state, seat) * card.effect.ratio);
      player.cash += amount;
      state.flow.injection += amount;
      break;
    }
    case 'cashPerTile': {
      const count = Object.values(state.tiles).filter((t) => t.owner === seat).length;
      const amount = card.effect.amount * count;
      player.cash += amount;
      if (amount > 0) state.flow.injection += amount;
      break;
    }
    case 'moveTo': {
      moveToTarget(state, seat, card.effect.target, events);
      break;
    }
    case 'moveSteps': {
      player.position = advance(player.position, card.effect.steps, player.direction);
      break;
    }
    case 'heat': {
      const targetId = card.effect.regionId;
      state.heat[targetId] = clampHeat((state.heat[targetId] ?? 50) + card.effect.delta);
      break;
    }
    case 'item': {
      player.items[card.effect.item] += 1;
      events.push({ t: 'itemGained', seat, item: card.effect.item });
      break;
    }
    case 'upgradeRandom': {
      upgradeRandomTile(state, seat);
      break;
    }
    case 'repairAll': {
      const cost = Object.values(state.tiles)
        .filter((t) => t.owner === seat)
        .reduce((sum, t) => sum + upgradeCost(state, t.id) * 0.25, 0);
      player.cash -= cost;
      break;
    }
    case 'transferFromRichest': {
      const richest = state.players
        .filter((p) => !p.bankrupt)
        .sort((a, b) => netWorth(state, b.seat) - netWorth(state, a.seat))[0];
      if (richest && richest.seat !== seat) {
        const amount = netWorth(state, richest.seat) * card.effect.ratio;
        richest.cash -= amount;
        player.cash += amount;
        state.flow.transfer += amount;
      }
      break;
    }
    default:
      break;
  }
}

function moveToTarget(state: GameState, seat: SeatIndex, target: string, events: GameEvent[]): void {
  const player = state.players[seat];
  if (target === 'start') {
    player.position = 0;
    return;
  }
  if (target === 'jail') {
    player.jailTurns = CFG.jailMaxTurns;
    player.jailAttempts = 0;
    events.push({ t: 'jailed', seat, turns: player.jailTurns });
    return;
  }
  if (target === 'scenic') {
    const scenicIndex = state.cells.find((c) => c.kind === 'scenic')?.index ?? 9;
    player.position = scenicIndex;
    return;
  }
  if (target === 'nearestUtility') {
    const cells = state.cells;
    const forward = Array.from({ length: 24 }, (_, i) => advance(player.position, i + 1, player.direction));
    const hit = forward.find((idx) => {
      const kind = cells[idx]?.kind;
      return kind === 'bank' || kind === 'securities' || kind === 'shop';
    });
    if (hit !== undefined) player.position = hit;
  }
}

/** 随机升级一块自有地块。 */
function upgradeRandomTile(state: GameState, seat: SeatIndex): void {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat && t.level < 5);
  if (owned.length === 0) return;
  const picked = pickOne(state.rng, 'card', owned);
  state.rng = picked.rng;
  const tile = state.tiles[picked.value.id];
  if (state.players[seat].cash >= upgradeCost(state, tile.id)) {
    state.players[seat].cash -= upgradeCost(state, tile.id);
    tile.level = (tile.level + 1) as 1 | 2 | 3 | 4 | 5;
  }
}

/** 机会格结算：抽卡 + 35% 道具掉落（A15）。 */
export function resolveChanceCell(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  drawCard(state, seat, 'chance', events);
  const dropped = rollItemDrop(state, seat, 'item', CFG.chanceItemDropRate);
  if (dropped) {
    events.push({ t: 'itemGained', seat, item: dropped });
    pushLog(state, state.month, seat, 'event', `获得道具：${itemName(dropped)}`);
  }
}

/** 命运格结算：抽卡。 */
export function resolveDestinyCell(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  drawCard(state, seat, 'destiny', events);
  const dropped = rollItemDrop(state, seat, 'item', CFG.chanceItemDropRate * 0.5);
  if (dropped) pushLog(state, state.month, seat, 'event', `获得道具：${itemName(dropped)}`);
}

/** 证券格：买入一手楼价指数，并可能获得掉头卡（V1.8）。 */
export function resolveSecuritiesCell(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const player = state.players[seat];
  const price = CFG.securitiesInitialPrice;
  if (player.cash >= price) {
    const totalCost = player.securitiesCost * player.securitiesLots + price;
    player.cash -= price;
    player.securitiesLots += 1;
    player.securitiesCost = totalCost / player.securitiesLots;
    pushLog(state, state.month, seat, 'expense', `买入 1 手指数，成交价 ${price} 万`);
  }
  const dropped = rollItemDrop(state, seat, 'item', CFG.securitiesUTurnDropRate);
  if (dropped === 'uTurn') {
    events.push({ t: 'itemGained', seat, item: 'uTurn' });
  }
}

/** 道具商店：售价 = 总资产 × 3%，下限 10 万（V1.8）。 */
export function itemShopPrice(state: GameState, seat: SeatIndex): number {
  return Math.max(CFG.shopPriceFloor, netWorth(state, seat) * CFG.shopPriceRate);
}

export function buyItemFromShop(state: GameState, seat: SeatIndex, item: ItemKind): boolean {
  const price = itemShopPrice(state, seat);
  if (state.players[seat].cash < price) return false;
  state.players[seat].cash -= price;
  state.players[seat].items[item] += 1;
  pushLog(state, state.month, seat, 'expense', `购买道具 ${itemName(item)}，支出 ${price.toFixed(0)} 万`);
  return true;
}

/** 冻结政策的随机板块负面事件（13.1：负面事件写「某板块」）。 */
export function randomFrozenRegion(state: GameState): string {
  if (state.frozenRegion) return state.frozenRegion;
  if (!activePolicyIds(state).includes('dongJie')) return TILE_MAP[Object.keys(state.tiles)[0]].regionId;
  const picked = pickOne(state.rng, 'negativeRegion', REGIONS.map((r) => r.id));
  state.rng = picked.rng;
  state.frozenRegion = picked.value;
  return picked.value;
}

/** 停留卡：再次触发脚下地块（V1.5）。 */
export function retriggerFootTile(state: GameState, seat: SeatIndex, events: GameEvent[]): void {
  const cell = state.cells[state.players[seat].position];
  if (!cell) return;
  if (cell.kind === 'tile' && cell.tileId) {
    const tile = state.tiles[cell.tileId];
    if (tile.owner !== null && tile.owner !== seat) {
      payToll(state, seat, cell.tileId, events);
      return;
    }
    upgradeRandomTile(state, seat);
    return;
  }
  if (cell.kind === 'chance') resolveChanceCell(state, seat, events);
  if (cell.kind === 'destiny') resolveDestinyCell(state, seat, events);
  if (cell.kind === 'securities') resolveSecuritiesCell(state, seat, events);
}

/** 玩家的月度现金流（负值即为资金链危险信号，8.3）。 */
export function cashflowOf(state: GameState, seat: SeatIndex): number {
  return monthlyFlow(state, seat).net;
}

export function itemName(item: ItemKind): string {
  const names: Record<ItemKind, string> = {
    remoteDice: '遥控骰子',
    stay: '停留卡',
    uTurn: '掉头卡',
    barrier: '路障',
  };
  return names[item];
}

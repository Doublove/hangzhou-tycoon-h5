/**
 * AI 决策：把「效用最大化」翻译成 Command（A16：AI 与人类共用同一套命令接口）。
 *
 * 7.1：难度不通过「给 AI 加钱」实现，而是通过信息量与风险偏好实现。
 * 6.5：AI 也使用主动技能——否则人类每 8—15 个月白拿一次收益，难度曲线会崩。
 */
import type { ItemKind, SeatIndex } from '@/types';
import { CFG, ROLE_MAP } from '@/config';
import type { Command } from '../commands';
import { canBuy, canSell, canUpgrade, tileUnderFoot } from '../commands';
import type { GameState } from '../state';
import { activePolicyIds } from '../state';
import {
  tilePrice,
  leverageOf,
  loanLimitOf,
  monthlyFlow,
  netWorth,
  upgradeCost,
} from '../rules/economy';
import { itemShopPrice } from '../rules/cards';
import { buyUtility, cashBuffer, shouldCutLoss, upgradeUtility } from './evaluate';

/** AI 是否应该在这个时刻借钱（7.1：杠杆意愿由难度与角色偏好决定）。 */
function shouldLeverage(state: GameState, seat: SeatIndex): boolean {
  const player = state.players[seat];
  if (leverageOf(state, seat) >= player.levTarget) return false;
  if (activePolicyIds(state).includes('xianDai')) return false;
  return loanLimitOf(state, seat) > 0;
}

/** 在预算范围内选一块效用最高的无主地。 */
function bestAffordableTile(state: GameState, seat: SeatIndex): string | null {
  const affordable = Object.values(state.tiles).filter((t) => t.owner === null && t.unlocked);
  if (affordable.length === 0) return null;
  const budget = state.players[seat].cash - cashBuffer(state, seat) * 0.5;
  const scored = affordable
    .map((t) => ({ id: t.id, score: buyUtility(state, seat, t.id), price: tilePrice(state, t.id) }))
    .filter((entry) => entry.price <= budget)
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 && scored[0].score > 0 ? scored[0].id : null;
}

/** 不考虑预算、只看效用的「最想要的一块地」，用于判断是否需要融资。 */
function bestScoredTile(state: GameState, seat: SeatIndex): string | null {
  const scored = Object.values(state.tiles)
    .filter((t) => t.owner === null && t.unlocked)
    .map((t) => ({ id: t.id, score: buyUtility(state, seat, t.id) }))
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 && scored[0].score > 0 ? scored[0].id : null;
}

/** 选一块升级性价比最高的自有地块。 */
function bestUpgradeTile(state: GameState, seat: SeatIndex): string | null {
  const scored = Object.values(state.tiles)
    .filter((t) => t.owner === seat && canUpgrade(state, seat, t.id))
    .map((t) => ({ id: t.id, score: upgradeUtility(state, seat, t.id) }))
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 && scored[0].score > 0 ? scored[0].id : null;
}

/**
 * AI 主动技能启发式（6.5）：
 * 白拿钱的技能冷却一好就用；产生负债的（配资）只在缺钱时用；解除限制的只在被限制时用。
 */
function aiUseSkill(state: GameState, seat: SeatIndex): boolean {
  const player = state.players[seat];
  const role = ROLE_MAP[player.roleId];
  if (!role || player.skillCooldown > 0) return false;
  switch (role.skill.kind) {
    case 'cashByNetworth':
    case 'heatBoost':
      return true;
    case 'leverage':
      return player.cash < cashBuffer(state, seat) || monthlyFlow(state, seat).net < 0;
    case 'escape':
      return player.jailTurns > 0 || player.scenicTurns > 0;
    case 'discountBuy':
      return bestAffordableTile(state, seat) !== null;
    default:
      return false;
  }
}

/** AI 是否应该使用停留卡（V1.5 双刃剑）。 */
function aiUseStay(state: GameState, seat: SeatIndex): ItemKind | null {
  const tileId = tileUnderFoot(state, seat);
  if (!tileId) return null;
  const tile = state.tiles[tileId];
  if (tile.owner === seat && tile.level < 5) return 'stay';
  if (tile.owner === null && canBuy(state, seat, tileId)) return 'stay';
  return null;
}

/**
 * 产出 AI 的下一步命令；返回 null 表示「本回合无事可做」。
 * 调用方（UI 或批量模拟）把它喂给 applyCommand 即可，AI 没有任何特权路径。
 */
export function aiNextCommand(state: GameState): Command | null {
  const seat = state.activeSeat;
  const player = state.players[seat];
  if (player.bankrupt) return { t: 'endDecision' };

  if (state.awaiting === 'roll') return { t: 'rollDice' };
  if (state.awaiting === 'cardAck') return { t: 'ackCard' };
  if (state.awaiting !== 'decision') return null;

  // 1) 被限制时优先尝试解除
  if ((player.jailTurns > 0 || player.scenicTurns > 0) && aiUseSkill(state, seat)) {
    return { t: 'useSkill' };
  }

  // 2) 资金链紧张：先卖地止损（7.2 关键约束）
  if (shouldCutLoss(state, seat)) {
    const sellTarget = rentWeightedSellTarget(state, seat);
    if (sellTarget && canSell(state, seat, sellTarget)) return { t: 'sellTile', tileId: sellTarget };
  }

  // 3) 主动技能
  if (aiUseSkill(state, seat)) return { t: 'useSkill' };

  // 4) 道具：停留卡（在自家地上再升一级）
  const stayItem = aiUseStay(state, seat);
  if (stayItem && player.items.stay > 0) return { t: 'useItem', item: 'stay' };

  // 5) 买地：脚下优先
  const foot = tileUnderFoot(state, seat);
  if (foot && canBuy(state, seat, foot) && buyUtility(state, seat, foot) > 0) {
    if (player.cash - tilePrice(state, foot) >= cashBuffer(state, seat) * 0.5) {
      return { t: 'buyTile' };
    }
  }

  // 6) 加杠杆：为最想要的那块地筹钱（7.1 杠杆意愿由难度与角色偏好决定）
  if (shouldLeverage(state, seat)) {
    const wanted = bestScoredTile(state, seat);
    const limit = loanLimitOf(state, seat);
    if (wanted) {
      // 保留安全垫的前提下，为最想要的那块地筹钱
      const need = tilePrice(state, wanted) - player.cash + cashBuffer(state, seat);
      if (need > 0 && need <= limit) {
        return { t: 'takeLoan', amount: Math.min(limit, Math.ceil(need)) };
      }
    }
  }

  // 7) 升级
  const upgradeTarget = bestUpgradeTile(state, seat);
  if (upgradeTarget && player.cash - upgradeCost(state, upgradeTarget) > cashBuffer(state, seat)) {
    return { t: 'upgradeTile', tileId: upgradeTarget };
  }

  // 8) 杠杆高于目标且现金宽裕时降杠杆（与第 6 步的借款条件互补，避免「借了又还」）
  if (player.debt > 0 && player.cash > cashBuffer(state, seat) * 3 && leverageOf(state, seat) > player.levTarget) {
    return { t: 'repayLoan', amount: Math.min(player.debt, player.cash * 0.2) };
  }

  // 9) 备一件趁手道具（V1.8 道具商店）
  const price = itemShopPrice(state, seat);
  if (player.items.remoteDice === 0 && player.cash > price * 2) {
    return { t: 'buyItem', item: 'remoteDice' };
  }

  return { t: 'endDecision' };
}

/** 找一块最该卖掉的自有地：效用最低者（7.2 卖地止损）。 */
export function rentWeightedSellTarget(state: GameState, seat: SeatIndex): string | null {
  const owned = Object.values(state.tiles).filter((t) => t.owner === seat && canSell(state, seat, t.id));
  if (owned.length === 0) return null;
  return owned.sort((a, b) => buyUtility(state, seat, a.id) - buyUtility(state, seat, b.id))[0].id;
}

/** 跟风型判据（7.3 跟随）：自己持有的地少于第一名时更激进。 */
export function followerBehind(state: GameState, seat: SeatIndex): boolean {
  const leader = state.players
    .filter((p) => !p.bankrupt)
    .sort((a, b) => netWorth(state, b.seat) - netWorth(state, a.seat))[0];
  if (!leader || leader.seat === seat) return false;
  const ownCount = Object.values(state.tiles).filter((t) => t.owner === seat).length;
  const leaderCount = Object.values(state.tiles).filter((t) => t.owner === leader.seat).length;
  return ownCount < leaderCount;
}

/** AI 也可以评估总资产的目标 scaling（用于难度显示）。 */
export function aiTargetRatio(state: GameState, seat: SeatIndex): number {
  return state.players[seat].levTarget * CFG.leverageNoCap * 2;
}

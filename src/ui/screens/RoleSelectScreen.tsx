/**
 * 角色选择（P0）：六宫格，含技能说明与难度标识（9.3 / 6.2 / 6.5）。
 */
import { useState } from 'react';
import { ROLES } from '@/config';
import type { DifficultyId } from '@/types';
import { DIFFICULTY_DESC, DIFFICULTY_LABEL } from '@/ui/constants';

interface Props {
  difficulty: DifficultyId;
  onDifficulty: (value: DifficultyId) => void;
  onConfirm: (roleId: string) => void;
  onBack: () => void;
}

export function RoleSelectScreen({ difficulty, onDifficulty, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<string>(ROLES[0].id);
  const role = ROLES.find((r) => r.id === selected) ?? ROLES[0];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-game-xl font-bold text-foreground">选择角色</h2>
          <p className="text-game-sm text-muted-foreground">每个角色对应一种玩法，被动与主动技能各不相同</p>
        </div>
        <button type="button" onClick={onBack} className="text-game-sm text-muted-foreground hover:text-foreground">
          返回
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ROLES.map((item) => {
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`panel relative overflow-hidden p-3 text-left transition-all ${
                active ? 'border-gold/60 shadow-panel' : 'hover:border-white/20'
              }`}
            >
              <span
                className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="text-game-base font-semibold text-foreground">{item.name}</div>
              <div className="text-game-xs text-muted-foreground">{item.identity}</div>
              <div className="mt-2 text-game-xs text-westlake">
                初始 {item.cashBase} 万 · {'★'.repeat(item.difficultyStars)}
                {'☆'.repeat(3 - item.difficultyStars)}
              </div>
              <div className="mt-1 text-game-xs text-gold">
                {item.skill.name} · {item.skill.cooldownMonths} 月
              </div>
              {!item.artReady ? (
                <div className="mt-1 inline-block rounded-sm border border-white/10 px-1 text-[11px] text-muted-foreground">
                  剪影占位
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="panel mt-4 p-4">
        <div className="text-game-base font-semibold text-foreground">{role.name}</div>
        <p className="mt-1 text-game-sm leading-relaxed text-muted-foreground">{role.desc}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-white/10 bg-ink-600 p-3">
            <div className="text-game-xs uppercase tracking-widest text-muted-foreground">主动技能</div>
            <div className="text-game-sm text-foreground">
              {role.skill.name}（冷却 {role.skill.cooldownMonths} 月）
            </div>
            <div className="text-game-xs text-muted-foreground">{role.skill.desc}</div>
          </div>
          <div className="rounded-sm border border-white/10 bg-ink-600 p-3">
            <div className="text-game-xs uppercase tracking-widest text-muted-foreground">被动</div>
            <div className="text-game-sm text-foreground">{passiveText(role.id)}</div>
          </div>
        </div>
      </div>

      <div className="panel mt-4 p-4">
        <div className="mb-2 text-game-xs uppercase tracking-widest text-muted-foreground">AI 难度</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['easy', 'normal', 'hard'] as DifficultyId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onDifficulty(id)}
              className={`rounded-sm border px-3 py-2 text-left transition-colors ${
                difficulty === id ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-ink-600 hover:bg-ink-500'
              }`}
            >
              <div className="text-game-sm text-foreground">{DIFFICULTY_LABEL[id]}</div>
              <div className="text-game-xs text-muted-foreground">{DIFFICULTY_DESC[id]}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onConfirm(selected)}
        className="btn-brass mt-5 h-12 w-full text-game-lg"
      >
        选择该角色开局
      </button>
    </div>
  );
}

function passiveText(roleId: string): string {
  const map: Record<string, string> = {
    hangtoutou: '祖宅底气：破产判定时免死一次',
    wenlaoban: '杠杆之王：贷款额度 +30%、利息 −20%',
    mage: '期权变现：每 12 个月一笔奖金，未来科技城租金 +25%',
    alian: '景区红利：西湖边 / 之江 / 城北租金 +30%，每章多抽 1 张机会卡',
    xiaolongbao: '流量即地价：可为任一区域加热度',
    wangzhongjie: '信息差：买卖手续费减半，遥控骰子 6 张',
  };
  return map[roleId] ?? '—';
}

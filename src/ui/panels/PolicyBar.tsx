/**
 * 政策条：顶部常驻，显示当前生效政策，点击展开生效时间 / 剩余月数 / 数值影响（9.3）。
 */
import { useState } from 'react';
import type { PolicyConfig } from '@/types';

interface Props {
  policies: Array<PolicyConfig | undefined>;
}

export function PolicyBar({ policies }: Props) {
  const [open, setOpen] = useState(false);
  const list = policies.filter(Boolean) as PolicyConfig[];
  if (list.length === 0) return null;

  return (
    <div className="border-t border-white/5 bg-loss/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-1 text-game-xs text-loss"
      >
        <span className="rounded-sm border border-loss/40 px-1">政策生效</span>
        {list.map((p) => (
          <span key={p.id} className="tnum">
            {p.name}
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">{open ? '收起' : '展开'}</span>
      </button>
      {open ? (
        <div className="mx-auto max-w-[1440px] space-y-1 px-4 pb-2">
          {list.map((p) => (
            <div key={p.id} className="rounded-sm border border-white/10 bg-ink-700 px-2 py-1 text-game-xs">
              <span className="text-loss">{p.name}</span>
              <span className="ml-2 text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

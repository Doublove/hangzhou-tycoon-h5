/**
 * 批量模拟报告页（?sim=1）：改一个数值后重跑，用六项指标判断方向（8.6）。
 */
import { useEffect, useState } from 'react';
import { formatReport, runSimulation, type SimulationReport } from '@/sim/run';

export function SimReportScreen() {
  const [report, setReport] = useState<SimulationReport | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const games = Number(params.get('games') ?? 40);
    setReport(
      runSimulation({
        games: Number.isFinite(games) && games > 0 ? Math.min(games, 200) : 40,
        seed: Number(params.get('seed') ?? 20260101),
        chapterId: Number(params.get('chapter') ?? 1),
      }),
    );
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pt-10">
      <h1 className="text-game-xl font-bold text-foreground">批量模拟报告</h1>
      <p className="mt-1 text-game-sm text-muted-foreground">
        用于数值校准（8.6）：改一个数值后重跑，判断方向对不对。
      </p>
      <pre className="panel mt-4 whitespace-pre-wrap p-4 text-game-xs leading-relaxed text-foreground">
        {report ? formatReport(report) : '模拟中…'}
      </pre>
      {report ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-game-xs sm:grid-cols-4">
          <Stat label="头尾净资产比" value={report.avgSpreadRatio.toFixed(2)} />
          <Stat label="玩家胜率" value={`${(report.humanWinRate * 100).toFixed(1)}%`} />
          <Stat label="场均破产" value={report.avgBankruptcies.toFixed(2)} />
          <Stat label="人均升级" value={report.avgUpgradesPerPlayer.toFixed(2)} />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="tnum text-game-base text-foreground">{value}</div>
    </div>
  );
}

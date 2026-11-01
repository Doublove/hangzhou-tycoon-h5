/**
 * 应用外壳：五屏流程（启动 → 角色 → 章节 → 主地图 → 结算）。
 *
 * 与需求文档的对应关系：
 *  - 免登录、3 秒内可交互（9.3）；
 *  - ?sim=1 直接进入批量模拟报告页（8.6）；
 *  - 广告只留接口与频次控制，M2.5 才接入真实 SDK（11.6 / D11）。
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DifficultyId, SeatIndex } from '@/types';
import type { GameState } from '@/engine/state';
import { netWorth } from '@/engine/rules/economy';
import { useEngine, type EngineOptions } from '@/ui/hooks/useEngine';
import { LaunchScreen } from '@/ui/screens/LaunchScreen';
import { RoleSelectScreen } from '@/ui/screens/RoleSelectScreen';
import { ChapterSelectScreen } from '@/ui/screens/ChapterSelectScreen';
import { MainGameScreen } from '@/ui/screens/MainGameScreen';
// 结算页与模拟报告页含图表库，按需加载以守住首屏 3MB / 3 秒（10.5）
const ResultScreen = lazy(() =>
  import('@/ui/screens/ResultScreen').then((m) => ({ default: m.ResultScreen })),
);
const SimReportScreen = lazy(() =>
  import('@/ui/screens/SimReportScreen').then((m) => ({ default: m.SimReportScreen })),
);
import { loadGame, saveGame } from '@/platform/storage';
import { track } from '@/platform/feedback';

type Stage = 'launch' | 'role' | 'chapter' | 'game' | 'result';

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const simMode = params.get('sim') === '1';

  const [stage, setStage] = useState<Stage>('launch');
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<number>(1);
  const [runKey, setRunKey] = useState(0);

  const options: EngineOptions | null = useMemo(() => {
    if (!roleId || stage === 'launch' || stage === 'role' || stage === 'chapter') return null;
    return {
      seed: 20260101 + runKey * 7919 + chapterId * 31,
      chapterId,
      roleId,
      difficulty,
      initial: restored.current,
    };
  }, [roleId, stage, chapterId, difficulty, runKey]);

  const engine = useEngine(options);
  const history = useRef<Array<{ month: number; worth: number[] }>>([]);
  const restored = useRef<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(Boolean(loadGame('auto')));
  }, []);

  // 记录净资产曲线（结算页用）
  useEffect(() => {
    if (!options || !engine.state) return;
    const month = engine.state.month;
    const worth = engine.state.players.map((_, seat) => netWorth(engine.state, seat as SeatIndex));
    const last = history.current[history.current.length - 1];
    if (!last || last.month !== month) {
      history.current = [...history.current, { month, worth }].slice(-240);
    }
  }, [engine.state, options]);

  useEffect(() => {
    if (stage === 'game' && engine.finished) {
      track({ t: 'chapterEnd', chapterId, month: engine.state.month });
      setStage('result');
    }
  }, [engine.finished, stage, chapterId, engine.state]);

  const startGame = useCallback(() => {
    setStage('role');
  }, []);

  const continueGame = useCallback(() => {
    const record = loadGame('auto');
    if (!record) return;
    restored.current = record.state;
    setChapterId(record.state.chapterId);
    setRoleId(record.state.players[0].roleId);
    setDifficulty(record.state.players[1].difficulty);
    setStage('game');
  }, []);

  if (simMode) {
    return (
      <Suspense fallback={<Loading />}>
        <SimReportScreen />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      {stage === 'launch' ? (
        <LaunchScreen onStart={startGame} onContinue={continueGame} hasSave={hasSave} />
      ) : null}

      {stage === 'role' ? (
        <RoleSelectScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onConfirm={(id) => {
            setRoleId(id);
            setStage('chapter');
          }}
          onBack={() => setStage('launch')}
        />
      ) : null}

      {stage === 'chapter' ? (
        <ChapterSelectScreen
          onPick={(id) => {
            setChapterId(id);
            track({ t: 'chapterStart', chapterId: id });
            setStage('game');
          }}
          onBack={() => setStage('role')}
        />
      ) : null}

      {stage === 'game' ? (
        <MainGameScreen
          state={engine.state}
          view={engine.view}
          act={engine.act}
          isHumanTurn={engine.isHumanTurn}
          onQuit={() => {
            saveGame('slot1', engine.state);
            track({ t: 'chapterAbandon', chapterId, month: engine.state.month });
            setStage('launch');
            setRoleId(null);
          }}
        />
      ) : null}

      {stage === 'result' ? (
        <Suspense fallback={<Loading />}>
          <ResultScreen
            state={engine.state}
            history={history.current}
            onRestart={() => {
              history.current = [];
              restored.current = null;
              setRunKey((k) => k + 1);
              setStage('game');
            }}
            onHome={() => {
              setRoleId(null);
              setStage('launch');
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-game-sm text-muted-foreground">
      加载中…
    </div>
  );
}



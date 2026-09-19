import { Volume2, VolumeX } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  installAudioUnlock,
  playSound,
  readSoundEnabled,
  setSoundEnabled,
} from './audio';
import {
  COMBO_RESET_MS,
  DANGER_GRACE_MS,
  DROP_COOLDOWN_MS,
  DROP_LIMIT_SETTLE_MS,
  OVERDRIVE_DURATION_MS,
  OVERDRIVE_MAX,
  drawSpawnTier,
  getOverdriveExtensionMs,
  getOverdriveGain,
  makeOrder,
  shiftGameplayClocksForPause,
  shiftGameplayTimestampForPause,
  type Order,
} from './gameplay';
import { createFixedStepGameLoop } from './game-loop';
import {
  EXPERIMENTS,
  advanceExperimentProgress,
  getNextExperimentId,
  getResumeExperimentId,
} from './experiments';
import {
  goalProgressText,
  isGoalComplete,
  type RunGoalContext,
} from './goals';
import { haptic } from './haptics';
import {
  createSeededRandom,
  getRunPreset,
  getSeededRandomState,
  setSeededRandomState,
  usesPersistentMetaProgress,
  type GameMode,
  type RunPreset,
} from './modes';
import {
  DANGER_Y,
  FLOOR_Y,
  HEIGHT,
  LEFT_WALL,
  MAX_TIER,
  RIGHT_WALL,
  TIER_DEFS,
  WIDTH,
  spawnBody,
  stepWorld,
  type Body,
  type World,
} from './physics';
import { MonsterArt, REDUCED_MOTION, drawMonster, drawTank } from './rendering';
import { LabModal, MonstersModal, ShopModal } from './game-modals';
import { GameToolbar } from './game-toolbar';
import { RunOverlays } from './run-overlays';
import { storageGet, storageRemove, storageSet } from './storage';
import {
  emitTelemetry,
  type RunTerminalMetrics,
  type TelemetryContext,
} from './telemetry';
import {
  decodeActiveRunSession,
  encodeActiveRunSession,
  restoreBodiesFromSession,
  saveBodyForSession,
  type ActiveRunSession,
} from './session';

type Burst = { x: number; y: number; tier: number; start: number };
type Ui = {
  score: number;
  coins: number;
  bestScore: number;
  bestTier: number;
  orderNo: number;
  order: Order;
  progress: number;
  currentTier: number;
  nextTier: number;
  afterNextTier: number;
  holdTier: number | null;
  canHold: boolean;
  canDrop: boolean;
  gameOver: boolean;
  sound: boolean;
  combo: number;
  bestCombo: number;
  message: string;
  powerCharges: number;
  overdrive: number;
  overdriveActive: boolean;
  experimentComplete: boolean;
  experimentFailed: boolean;
  runHighestTier: number;
  runMerges: number;
  runDrops: number;
  runHoldUses: number;
  runPowerUses: number;
  runOrdersCompleted: number;
  runRescues: number;
};

function getRunGoalContext(state: Ui, pileBelowDanger: boolean): RunGoalContext {
  return {
    score: state.score,
    bestCombo: state.bestCombo,
    highestTier: state.runHighestTier,
    merges: state.runMerges,
    drops: state.runDrops,
    ordersCompleted: state.runOrdersCompleted,
    rescues: state.runRescues,
    pileBelowDanger,
  };
}

function getTelemetryContext(preset: RunPreset): TelemetryContext {
  return {
    mode: preset.mode,
    ...(preset.experimentId ? { experimentId: preset.experimentId } : {}),
    ...(preset.dailyKey ? { dailyKey: preset.dailyKey } : {}),
  };
}

const COINS_KEY = 'monster-merge-coins-v3';
const BEST_SCORE_KEY = 'monster-merge-best-score-v3';
const BEST_TIER_KEY = 'monster-merge-best-tier-v3';
const ORDER_KEY = 'monster-merge-order-v3';
const COACH_KEY = 'monster-merge-coach-v3';
const POWER_KEY = 'monster-merge-power-v1';
const EXPERIMENT_PROGRESS_KEY = 'monster-merge-experiments-completed-v1';
const ACTIVE_RUN_KEY = 'monster-merge-active-run-v1';
const POWER_COST = 200;
function readInt(key: string, fallback = 0) {
  const value = Number(storageGet(key));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function drawRunTier(
  fixedQueue: number[],
  bag: number[],
  bestTier: number,
  random: () => number,
) {
  if (fixedQueue.length > 0) return fixedQueue.shift() ?? 0;
  return drawSpawnTier(bag, bestTier, random);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const worldRef = useRef<World>({ bodies: [] });
  const aimXRef = useRef(WIDTH / 2);
  const dropTimerRef = useRef<number | null>(null);
  const dropReadyAtRef = useRef<number | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const comboResetAtRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const limitTimerRef = useRef<number | null>(null);
  const limitResolveAtRef = useRef<number | null>(null);
  const restoredDropLimitPendingRef = useRef(false);
  const dangerRef = useRef<number | null>(null);
  const lastMergeRef = useRef(-Infinity);
  const burstsRef = useRef<Burst[]>([]);
  const spawnBagRef = useRef<number[]>([]);
  const fixedQueueRef = useRef<number[]>([]);
  const randomRef = useRef<() => number>(Math.random);
  const presetRef = useRef<RunPreset>(getRunPreset('endless'));
  const overdriveEndRef = useRef(0);
  const runStartedAtRef = useRef(performance.now());
  const firstDecisionElapsedRef = useRef<number | null>(null);
  const runOverdriveStartsRef = useRef(0);
  const runDangerStartsRef = useRef(0);
  const restoredSessionRef = useRef(false);

  const initialOrderNo = Math.max(1, readInt(ORDER_KEY, 1));
  const initialBestTier = readInt(BEST_TIER_KEY, 0);
  const initialExperimentsCompleted = Math.min(
    EXPERIMENTS.length,
    readInt(EXPERIMENT_PROGRESS_KEY, 0),
  );
  const [experimentsCompleted, setExperimentsCompleted] = useState(
    initialExperimentsCompleted,
  );
  const experimentsCompletedRef = useRef(initialExperimentsCompleted);
  experimentsCompletedRef.current = experimentsCompleted;
  const [coach, setCoach] = useState(storageGet(COACH_KEY) !== 'done');
  const [showMonsters, setShowMonsters] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [preset, setPreset] = useState<RunPreset>(() => presetRef.current);
  const [ui, setUi] = useState<Ui>(() => {
    const currentTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      initialBestTier,
      randomRef.current,
    );
    const nextTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      initialBestTier,
      randomRef.current,
    );
    const afterNextTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      initialBestTier,
      randomRef.current,
    );
    return {
      score: 0,
      coins: readInt(COINS_KEY, 0),
      bestScore: readInt(BEST_SCORE_KEY, 0),
      bestTier: initialBestTier,
      orderNo: initialOrderNo,
      order: makeOrder(initialOrderNo),
      progress: 0,
      currentTier,
      nextTier,
      afterNextTier,
      holdTier: null,
      canHold: true,
      canDrop: true,
      gameOver: false,
      sound: readSoundEnabled(),
      combo: 0,
      bestCombo: 0,
      message: '',
      powerCharges: readInt(POWER_KEY, 1),
      overdrive: 0,
      overdriveActive: false,
      experimentComplete: false,
      experimentFailed: false,
      runHighestTier: 0,
      runMerges: 0,
      runDrops: 0,
      runHoldUses: 0,
      runPowerUses: 0,
      runOrdersCompleted: 0,
      runRescues: 0,
    };
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const sync = useCallback(() => setUi({ ...uiRef.current }), []);

  const runElapsedMs = useCallback(
    () => Math.max(0, performance.now() - runStartedAtRef.current),
    [],
  );

  const markFirstDecision = useCallback(() => {
    if (firstDecisionElapsedRef.current === null) {
      firstDecisionElapsedRef.current = runElapsedMs();
    }
  }, [runElapsedMs]);

  const getTerminalMetrics = useCallback((): RunTerminalMetrics => {
    const state = uiRef.current;
    return {
      runDurationMs: runElapsedMs(),
      timeToFirstDecisionMs: firstDecisionElapsedRef.current,
      drops: state.runDrops,
      merges: state.runMerges,
      highestTier: state.runHighestTier,
      holdUses: state.runHoldUses,
      powerUses: state.runPowerUses,
      overdriveStarts: runOverdriveStartsRef.current,
      dangerStarts: runDangerStartsRef.current,
      rescues: state.runRescues,
    };
  }, [runElapsedMs]);

  const saveRunSession = useCallback(() => {
    const state = uiRef.current;
    const activePreset = presetRef.current;

    if (
      state.gameOver ||
      state.experimentComplete ||
      state.experimentFailed
    ) {
      storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    if (
      activePreset.mode === 'endless' &&
      state.runDrops === 0 &&
      worldRef.current.bodies.length === 0
    ) {
      storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    const now = performance.now();
    const randomState = getSeededRandomState(randomRef.current);
    const session: ActiveRunSession = {
      version: 1,
      savedAt: Date.now(),
      mode: activePreset.mode,
      ...(activePreset.experimentId
        ? { experimentId: activePreset.experimentId }
        : {}),
      ...(activePreset.dailyKey ? { dailyKey: activePreset.dailyKey } : {}),
      ui: {
        score: state.score,
        progress: state.progress,
        orderNo: state.orderNo,
        currentTier: state.currentTier,
        nextTier: state.nextTier,
        afterNextTier: state.afterNextTier,
        holdTier: state.holdTier,
        canHold: state.canHold,
        bestCombo: state.bestCombo,
        overdrive: state.overdrive,
        overdriveActive: state.overdriveActive,
        runHighestTier: state.runHighestTier,
        runMerges: state.runMerges,
        runDrops: state.runDrops,
        runHoldUses: state.runHoldUses,
        runPowerUses: state.runPowerUses,
        runOrdersCompleted: state.runOrdersCompleted,
        runRescues: state.runRescues,
        runOverdriveStarts: runOverdriveStartsRef.current,
        runDangerStarts: runDangerStartsRef.current,
      },
      bodies: worldRef.current.bodies.map((body) =>
        saveBodyForSession(body, now),
      ),
      fixedQueue: [...fixedQueueRef.current],
      spawnBag: [...spawnBagRef.current],
      aimX: aimXRef.current,
      dangerElapsedMs:
        dangerRef.current === null
          ? null
          : Math.max(0, now - dangerRef.current),
      overdriveRemainingMs:
        state.overdriveActive && overdriveEndRef.current > 0
          ? Math.max(0, overdriveEndRef.current - now)
          : 0,
      runElapsedMs: Math.max(0, now - runStartedAtRef.current),
      firstDecisionElapsedMs: firstDecisionElapsedRef.current,
      ...(randomState === undefined ? {} : { randomState }),
    };

    storageSet(ACTIVE_RUN_KEY, encodeActiveRunSession(session));
  }, []);

  useEffect(() => {
    const raw = storageGet(ACTIVE_RUN_KEY);
    const session = decodeActiveRunSession(raw);
    if (!session) {
      if (raw) storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    let restoredPreset: RunPreset;
    try {
      restoredPreset = getRunPreset(
        session.mode,
        new Date(),
        session.experimentId,
      );
    } catch {
      storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    if (
      session.mode === 'daily' &&
      restoredPreset.dailyKey !== session.dailyKey
    ) {
      storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    const now = performance.now();
    const random =
      restoredPreset.seed === undefined
        ? Math.random
        : createSeededRandom(restoredPreset.seed);
    try {
      setSeededRandomState(random, session.randomState);
    } catch {
      storageRemove(ACTIVE_RUN_KEY);
      return;
    }

    presetRef.current = restoredPreset;
    setPreset(restoredPreset);
    fixedQueueRef.current = [...session.fixedQueue];
    spawnBagRef.current = [...session.spawnBag];
    randomRef.current = random;
    worldRef.current.bodies = restoreBodiesFromSession(session.bodies, now);
    runStartedAtRef.current = now - (session.runElapsedMs ?? 0);
    firstDecisionElapsedRef.current =
      session.firstDecisionElapsedMs ?? null;
    runOverdriveStartsRef.current = session.ui.runOverdriveStarts ?? 0;
    runDangerStartsRef.current = session.ui.runDangerStarts ?? 0;
    restoredSessionRef.current = true;

    const currentRadius = TIER_DEFS[session.ui.currentTier]!.radius;
    aimXRef.current = Math.max(
      LEFT_WALL + currentRadius + 2,
      Math.min(RIGHT_WALL - currentRadius - 2, session.aimX),
    );
    dangerRef.current =
      session.dangerElapsedMs === null
        ? null
        : now - session.dangerElapsedMs;
    overdriveEndRef.current = session.ui.overdriveActive
      ? now + session.overdriveRemainingMs
      : 0;

    const state = uiRef.current;
    state.score = session.ui.score;
    state.progress = session.ui.progress;
    state.orderNo = session.ui.orderNo;
    state.order = makeOrder(session.ui.orderNo);
    state.currentTier = session.ui.currentTier;
    state.nextTier = session.ui.nextTier;
    state.afterNextTier = session.ui.afterNextTier;
    state.holdTier = session.ui.holdTier;
    state.canHold = session.ui.canHold;
    const restoredDropLimit = restoredPreset.limits?.drops;
    const restoredAtDropLimit =
      restoredDropLimit !== undefined &&
      session.ui.runDrops >= restoredDropLimit;
    state.canDrop = !restoredAtDropLimit;
    restoredDropLimitPendingRef.current = restoredAtDropLimit;
    state.gameOver = false;
    state.combo = 0;
    state.bestCombo = session.ui.bestCombo;
    state.message = '';
    state.overdrive = session.ui.overdrive;
    state.overdriveActive = session.ui.overdriveActive;
    state.experimentComplete = false;
    state.experimentFailed = false;
    state.runHighestTier = session.ui.runHighestTier;
    state.runMerges = session.ui.runMerges;
    state.runDrops = session.ui.runDrops;
    state.runHoldUses = session.ui.runHoldUses;
    state.runPowerUses = session.ui.runPowerUses;
    state.runOrdersCompleted = session.ui.runOrdersCompleted;
    state.runRescues = session.ui.runRescues;
    sync();
  }, [sync]);

  useEffect(() => {
    installAudioUnlock();
  }, []);

  useEffect(() => {
    const context = getTelemetryContext(presetRef.current);
    const resumed = restoredSessionRef.current;
    emitTelemetry({ name: 'session_start', ...context });
    emitTelemetry({ name: 'run_started', ...context, resumed });
    if (presetRef.current.mode === 'experiments') {
      emitTelemetry({
        name: 'experiment_started',
        ...context,
        resumed,
      });
    }
  }, []);

  useEffect(() => {
    const persist = () => saveRunSession();
    const onVisibility = () => {
      if (document.hidden) persist();
    };
    const timer = window.setInterval(persist, 1500);
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [saveRunSession]);

  const flash = useCallback((message: string) => {
    uiRef.current.message = message;
    sync();
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => {
      uiRef.current.message = '';
      sync();
    }, 1100);
  }, [sync]);

  const isPileBelowDanger = useCallback(
    () => worldRef.current.bodies.every((body) => body.y - body.r >= DANGER_Y),
    [],
  );

  const completeExperimentIfGoalMet = useCallback(() => {
    const state = uiRef.current;
    if (state.experimentComplete || state.experimentFailed) return false;
    if (
      !isGoalComplete(
        presetRef.current.goal,
        getRunGoalContext(state, isPileBelowDanger()),
      )
    ) {
      return false;
    }
    state.experimentComplete = true;
    state.canDrop = false;
    storageRemove(ACTIVE_RUN_KEY);
    if (
      presetRef.current.mode === 'experiments' &&
      presetRef.current.experimentId
    ) {
      const nextCompleted = advanceExperimentProgress(
        experimentsCompletedRef.current,
        presetRef.current.experimentId,
      );
      if (nextCompleted !== experimentsCompletedRef.current) {
        experimentsCompletedRef.current = nextCompleted;
        setExperimentsCompleted(nextCompleted);
        storageSet(EXPERIMENT_PROGRESS_KEY, String(nextCompleted));
      }
    }
    emitTelemetry({
      name: 'experiment_completed',
      ...getTelemetryContext(presetRef.current),
      score: state.score,
      goalKind: presetRef.current.goal?.kind ?? 'unknown',
      metrics: getTerminalMetrics(),
    });
    if (limitTimerRef.current !== null) {
      window.clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }
    limitResolveAtRef.current = null;
    return true;
  }, [getTerminalMetrics, isPileBelowDanger]);

  const resetCombo = useCallback(() => {
    comboTimerRef.current = null;
    comboResetAtRef.current = null;
    if (uiRef.current.combo !== 0) {
      uiRef.current.combo = 0;
      sync();
    }
  }, [sync]);

  const resolveDropLimit = useCallback(() => {
    limitTimerRef.current = null;
    limitResolveAtRef.current = null;
    if (completeExperimentIfGoalMet()) {
      sync();
      playSound('order');
      haptic('order');
      return;
    }
    const finalState = uiRef.current;
    if (
      !finalState.experimentComplete &&
      !finalState.experimentFailed &&
      !finalState.gameOver
    ) {
      finalState.experimentFailed = true;
      finalState.canDrop = false;
      storageRemove(ACTIVE_RUN_KEY);
      emitTelemetry({
        name: 'experiment_failed',
        ...getTelemetryContext(presetRef.current),
        score: finalState.score,
        reason: 'drop_limit',
        metrics: getTerminalMetrics(),
      });
      sync();
      playSound('fail');
      haptic('fail');
    }
  }, [completeExperimentIfGoalMet, getTerminalMetrics, sync]);

  useEffect(() => {
    if (!restoredDropLimitPendingRef.current) return;
    restoredDropLimitPendingRef.current = false;
    if (limitTimerRef.current !== null) {
      window.clearTimeout(limitTimerRef.current);
    }
    limitResolveAtRef.current =
      performance.now() + DROP_LIMIT_SETTLE_MS;
    limitTimerRef.current = window.setTimeout(
      resolveDropLimit,
      DROP_LIMIT_SETTLE_MS,
    );
  }, [resolveDropLimit]);

  const finishDropCooldown = useCallback(() => {
    dropTimerRef.current = null;
    dropReadyAtRef.current = null;
    const current = uiRef.current;
    if (
      current.gameOver ||
      current.experimentComplete ||
      current.experimentFailed
    ) {
      return;
    }
    const maxDrops = presetRef.current.limits?.drops;
    if (maxDrops !== undefined && current.runDrops >= maxDrops) {
      current.canDrop = false;
      if (limitTimerRef.current !== null) {
        window.clearTimeout(limitTimerRef.current);
      }
      limitResolveAtRef.current =
        performance.now() + DROP_LIMIT_SETTLE_MS;
      limitTimerRef.current = window.setTimeout(
        resolveDropLimit,
        DROP_LIMIT_SETTLE_MS,
      );
    } else {
      current.canDrop = true;
      sync();
    }
  }, [resolveDropLimit, sync]);

  const updateAim = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const r = TIER_DEFS[uiRef.current.currentTier]!.radius;
    aimXRef.current = Math.max(LEFT_WALL + r + 2, Math.min(RIGHT_WALL - r - 2, x));
  }, []);

  const drop = useCallback(() => {
    const state = uiRef.current;
    if (!state.canDrop || state.gameOver || state.experimentFailed) return;
    const dropLimit = presetRef.current.limits?.drops;
    if (dropLimit !== undefined && state.runDrops >= dropLimit) {
      flash('Drop limit reached');
      return;
    }
    const tier = state.currentTier;
    const r = TIER_DEFS[tier]!.radius;
    const x = aimXRef.current;
    const blocked = worldRef.current.bodies.some((body) => {
      const dx = body.x - x;
      const dy = body.y - 82;
      return dx * dx + dy * dy < (body.r + r + 4) ** 2;
    });
    if (blocked) {
      flash('No room here');
      playSound('fail');
      haptic('fail');
      return;
    }

    const dropAt = performance.now();
    worldRef.current.bodies.push(spawnBody(tier, x, 82, dropAt));
    state.runDrops += 1;
    markFirstDecision();
    const telemetryContext = getTelemetryContext(presetRef.current);
    emitTelemetry({
      name: 'drop',
      ...telemetryContext,
      tier,
      drops: state.runDrops,
    });
    if (state.runDrops === 1) {
      emitTelemetry({
        name: 'first_drop',
        ...telemetryContext,
        tier,
        drops: state.runDrops,
        runElapsedMs: runElapsedMs(),
      });
    }
    state.currentTier = state.nextTier;
    state.nextTier = state.afterNextTier;
    const spawnProgressTier =
      presetRef.current.mode === 'endless' ? state.bestTier : 0;
    state.afterNextTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      spawnProgressTier,
      randomRef.current,
    );
    state.canHold = true;
    state.canDrop = false;
    sync();
    if (coach) {
      storageSet(COACH_KEY, 'done');
      setCoach(false);
    }
    playSound('drop');
    haptic('drop');

    if (dropTimerRef.current !== null) {
      window.clearTimeout(dropTimerRef.current);
    }
    dropReadyAtRef.current = performance.now() + DROP_COOLDOWN_MS;
    dropTimerRef.current = window.setTimeout(
      finishDropCooldown,
      DROP_COOLDOWN_MS,
    );
  }, [
    coach,
    finishDropCooldown,
    flash,
    markFirstDecision,
    runElapsedMs,
    sync,
  ]);

  const resetRun = useCallback((mode: GameMode, experimentId?: string) => {
    storageRemove(ACTIVE_RUN_KEY);
    const nextPreset = getRunPreset(mode, new Date(), experimentId);
    presetRef.current = nextPreset;
    setPreset(nextPreset);
    fixedQueueRef.current = [...nextPreset.fixedQueue];
    randomRef.current =
      nextPreset.seed === undefined
        ? Math.random
        : createSeededRandom(nextPreset.seed);

    const preparedAt = performance.now() - 2000;
    worldRef.current.bodies = nextPreset.startBodies.map((startBody, index) => {
      const body = spawnBody(
        startBody.tier,
        startBody.x,
        startBody.y,
        preparedAt - index,
      );
      body.vx = 0;
      body.vy = 0;
      body.omega = 0;
      body.angle = startBody.angle ?? 0;
      return body;
    });
    burstsRef.current = [];
    spawnBagRef.current = [];
    dangerRef.current = null;
    lastMergeRef.current = -Infinity;
    overdriveEndRef.current = 0;
    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    if (comboTimerRef.current !== null) window.clearTimeout(comboTimerRef.current);
    if (limitTimerRef.current !== null) window.clearTimeout(limitTimerRef.current);
    dropTimerRef.current = null;
    comboTimerRef.current = null;
    limitTimerRef.current = null;
    dropReadyAtRef.current = null;
    comboResetAtRef.current = null;
    limitResolveAtRef.current = null;
    restoredDropLimitPendingRef.current = false;
    runStartedAtRef.current = performance.now();
    firstDecisionElapsedRef.current = null;
    runOverdriveStartsRef.current = 0;
    runDangerStartsRef.current = 0;
    restoredSessionRef.current = false;

    const state = uiRef.current;
    state.score = 0;
    state.progress = 0;
    const runOrderNo = usesPersistentMetaProgress(mode)
      ? Math.max(1, readInt(ORDER_KEY, 1))
      : 1;
    state.orderNo = runOrderNo;
    state.order = makeOrder(runOrderNo);
    state.combo = 0;
    state.bestCombo = 0;
    const spawnProgressTier = mode === 'endless' ? state.bestTier : 0;
    state.currentTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      spawnProgressTier,
      randomRef.current,
    );
    state.nextTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      spawnProgressTier,
      randomRef.current,
    );
    state.afterNextTier = drawRunTier(
      fixedQueueRef.current,
      spawnBagRef.current,
      spawnProgressTier,
      randomRef.current,
    );
    state.holdTier = null;
    state.canHold = true;
    state.canDrop = true;
    state.gameOver = false;
    state.message = '';
    state.overdrive = 0;
    state.overdriveActive = false;
    state.experimentComplete = false;
    state.experimentFailed = false;
    state.runHighestTier = 0;
    state.runMerges = 0;
    state.runDrops = 0;
    state.runHoldUses = 0;
    state.runPowerUses = 0;
    state.runOrdersCompleted = 0;
    state.runRescues = 0;
    aimXRef.current = WIDTH / 2;
    sync();
    const telemetryContext = getTelemetryContext(nextPreset);
    emitTelemetry({
      name: 'run_started',
      ...telemetryContext,
      resumed: false,
    });
    if (nextPreset.mode === 'experiments') {
      emitTelemetry({
        name: 'experiment_started',
        ...telemetryContext,
        resumed: false,
      });
    }
    saveRunSession();
    playSound('restart');
    haptic('restart');
  }, [saveRunSession, sync]);

  const restart = useCallback(() => {
    resetRun(presetRef.current.mode, presetRef.current.experimentId);
  }, [resetRun]);

  const startMode = useCallback((mode: GameMode) => {
    if (mode === 'experiments') {
      resetRun(
        mode,
        getResumeExperimentId(experimentsCompletedRef.current),
      );
    } else {
      resetRun(mode);
    }
    setShowLab(false);
  }, [resetRun]);

  const hold = useCallback(() => {
    const state = uiRef.current;
    if (
      !presetRef.current.allowHold ||
      !state.canDrop ||
      !state.canHold ||
      state.gameOver ||
      state.experimentComplete ||
      state.experimentFailed
    ) {
      return;
    }
    const holdLimit = presetRef.current.limits?.holdUses;
    if (holdLimit !== undefined && state.runHoldUses >= holdLimit) {
      flash('HOLD limit reached');
      return;
    }

    if (state.holdTier === state.currentTier) {
      flash('Same monster already held');
      return;
    }

    if (state.holdTier === null) {
      state.holdTier = state.currentTier;
      state.currentTier = state.nextTier;
      state.nextTier = state.afterNextTier;
      const spawnProgressTier =
        presetRef.current.mode === 'endless' ? state.bestTier : 0;
      state.afterNextTier = drawRunTier(
        fixedQueueRef.current,
        spawnBagRef.current,
        spawnProgressTier,
        randomRef.current,
      );
    } else {
      const held = state.holdTier;
      state.holdTier = state.currentTier;
      state.currentTier = held;
    }

    state.canHold = false;
    state.runHoldUses += 1;
    markFirstDecision();
    emitTelemetry({
      name: 'hold_used',
      ...getTelemetryContext(presetRef.current),
      uses: state.runHoldUses,
    });
    sync();
    playSound('ui');
    haptic('drop');
  }, [flash, markFirstDecision, sync]);

  const buyPower = useCallback(() => {
    const state = uiRef.current;
    if (!usesPersistentMetaProgress(presetRef.current.mode)) {
      flash('Shop purchases are available in Endless Lab');
      playSound('fail');
      haptic('fail');
      return;
    }
    if (state.coins < POWER_COST) {
      flash('Need ' + String(POWER_COST) + ' coins');
      playSound('fail');
      haptic('fail');
      return;
    }
    state.coins -= POWER_COST;
    state.powerCharges += 1;
    storageSet(COINS_KEY, String(state.coins));
    storageSet(POWER_KEY, String(state.powerCharges));
    sync();
    playSound('order');
    haptic('order');
  }, [flash, sync]);

  const nudge = useCallback(() => {
    const state = uiRef.current;
    if (!presetRef.current.allowPower) {
      flash('Power unavailable in this mode');
      return;
    }
    if (state.gameOver || state.experimentComplete || state.experimentFailed) return;
    const powerLimit = presetRef.current.limits?.powerUses;
    if (powerLimit !== undefined && state.runPowerUses >= powerLimit) {
      flash('Pulse limit reached');
      return;
    }
    const consumesInventory = usesPersistentMetaProgress(
      presetRef.current.mode,
    );
    if (consumesInventory && state.powerCharges <= 0) {
      setShowShop(true);
      flash('Get a Pulse in Shop');
      return;
    }
    if (worldRef.current.bodies.length === 0) {
      flash('Drop a monster first');
      return;
    }
    if (consumesInventory) {
      state.powerCharges -= 1;
      storageSet(POWER_KEY, String(state.powerCharges));
    }
    state.runPowerUses += 1;
    markFirstDecision();
    emitTelemetry({
      name: 'power_used',
      ...getTelemetryContext(presetRef.current),
      uses: state.runPowerUses,
    });
    sync();
    for (const body of worldRef.current.bodies) {
      const direction = body.x < WIDTH / 2 ? -1 : 1;
      body.vx += direction * (26 + Math.random() * 24);
      body.vy -= 24 + Math.random() * 18;
      body.impact = Math.max(body.impact, 0.28);
    }
    playSound('bounce');
    haptic('merge');
  }, [flash, markFirstDecision, sync]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const memory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const lowEndDevice =
      memory <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
    const maxDpr = lowEndDevice ? 1.6 : 2;
    const dpr = Math.min(
      maxDpr,
      Math.max(1, window.devicePixelRatio || 1),
    );
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const glassGradient = ctx.createLinearGradient(
      LEFT_WALL,
      0,
      RIGHT_WALL,
      0,
    );
    glassGradient.addColorStop(0, 'rgba(255,255,255,.16)');
    glassGradient.addColorStop(0.14, 'rgba(255,255,255,.025)');
    glassGradient.addColorStop(0.82, 'rgba(255,255,255,.02)');
    glassGradient.addColorStop(1, 'rgba(255,255,255,.13)');

    let lastBounce = -Infinity;
    const tierBuckets = Array.from(
      { length: MAX_TIER + 1 },
      () => [] as Body[],
    );
    let paused = document.hidden;
    let hiddenAt = paused ? performance.now() : null;

    const rearmTimer = (
      deadlineRef: { current: number | null },
      timerRef: { current: number | null },
      callback: () => void,
      now: number,
      pausedFor: number,
    ) => {
      if (deadlineRef.current === null) return;
      deadlineRef.current = shiftGameplayTimestampForPause(
        deadlineRef.current,
        pausedFor,
      );
      const remaining = Math.max(0, deadlineRef.current - now);
      timerRef.current = window.setTimeout(callback, remaining);
    };

    const onVisibility = () => {
      const now = performance.now();
      if (document.hidden) {
        paused = true;
        if (hiddenAt === null) hiddenAt = now;
        if (dropTimerRef.current !== null) {
          window.clearTimeout(dropTimerRef.current);
          dropTimerRef.current = null;
        }
        if (comboTimerRef.current !== null) {
          window.clearTimeout(comboTimerRef.current);
          comboTimerRef.current = null;
        }
        if (limitTimerRef.current !== null) {
          window.clearTimeout(limitTimerRef.current);
          limitTimerRef.current = null;
        }
      } else {
        const pausedFor =
          hiddenAt === null ? 0 : Math.max(0, now - hiddenAt);
        const shifted = shiftGameplayClocksForPause(
          pausedFor,
          dangerRef.current,
          overdriveEndRef.current,
          uiRef.current.overdriveActive,
        );
        dangerRef.current = shifted.dangerStartedAt;
        overdriveEndRef.current = shifted.overdriveEndsAt;
        runStartedAtRef.current =
          shiftGameplayTimestampForPause(
            runStartedAtRef.current,
            pausedFor,
          );
        lastMergeRef.current = shiftGameplayTimestampForPause(
          lastMergeRef.current,
          pausedFor,
        );
        for (const body of worldRef.current.bodies) {
          body.bornAt = shiftGameplayTimestampForPause(
            body.bornAt,
            pausedFor,
          );
        }
        for (const burst of burstsRef.current) {
          burst.start = shiftGameplayTimestampForPause(
            burst.start,
            pausedFor,
          );
        }
        rearmTimer(
          dropReadyAtRef,
          dropTimerRef,
          finishDropCooldown,
          now,
          pausedFor,
        );
        rearmTimer(
          comboResetAtRef,
          comboTimerRef,
          resetCombo,
          now,
          pausedFor,
        );
        rearmTimer(
          limitResolveAtRef,
          limitTimerRef,
          resolveDropLimit,
          now,
          pausedFor,
        );
        hiddenAt = null;
        paused = false;
      }
      loopController.resetClock(now);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onMerge = ({ tier, x, y }: { tier: number; x: number; y: number }) => {
      const state = uiRef.current;
      const now = performance.now();
      state.combo = now - lastMergeRef.current <= 1100
        ? Math.min(9, Math.max(1, state.combo) + 1)
        : 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.runMerges += 1;
      state.runHighestTier = Math.max(state.runHighestTier, tier);
      lastMergeRef.current = now;
      const scoreMultiplier = state.overdriveActive ? 2 : 1;
      state.score += Math.round(
        10 *
          2 ** tier *
          (1 + (state.combo - 1) * 0.25) *
          scoreMultiplier,
      );

      const activePreset = presetRef.current;
      const telemetryContext = getTelemetryContext(activePreset);
      emitTelemetry({
        name: 'merge',
        ...telemetryContext,
        tier,
        combo: state.combo,
        merges: state.runMerges,
        score: state.score,
      });
      if (state.runMerges === 1) {
        emitTelemetry({
          name: 'first_merge',
          ...telemetryContext,
          tier,
          combo: state.combo,
          merges: state.runMerges,
          score: state.score,
          runElapsedMs: runElapsedMs(),
        });
      }
      if (state.combo > 1) {
        emitTelemetry({
          name: 'chain',
          ...telemetryContext,
          combo: state.combo,
          score: state.score,
        });
      }
      if (activePreset.allowOverdrive && !state.overdriveActive) {
        state.overdrive = Math.min(
          OVERDRIVE_MAX,
          state.overdrive + getOverdriveGain(tier, state.combo),
        );
        if (state.overdrive >= OVERDRIVE_MAX) {
          state.overdrive = 0;
          state.overdriveActive = true;
          overdriveEndRef.current = now + OVERDRIVE_DURATION_MS;
          runOverdriveStartsRef.current += 1;
          emitTelemetry({
            name: 'overdrive_started',
            ...telemetryContext,
            score: state.score,
            count: runOverdriveStartsRef.current,
          });
          flash('LAB OVERDRIVE ×2');
          playSound('order');
          haptic('order');
        }
      } else if (activePreset.allowOverdrive && state.overdriveActive) {
        const extension = getOverdriveExtensionMs(state.combo);
        if (extension > 0) {
          overdriveEndRef.current = Math.min(
            overdriveEndRef.current + extension,
            now + OVERDRIVE_DURATION_MS,
          );
        }
      } else {
        state.overdrive = 0;
        state.overdriveActive = false;
      }
      if (usesPersistentMetaProgress(activePreset.mode)) {
        state.bestTier = Math.max(state.bestTier, tier);
        state.bestScore = Math.max(state.bestScore, state.score);
        storageSet(BEST_TIER_KEY, String(state.bestTier));
        storageSet(BEST_SCORE_KEY, String(state.bestScore));
      }
      burstsRef.current.push({ x, y, tier, start: now });
      if (burstsRef.current.length > 14) burstsRef.current.shift();

      if (comboTimerRef.current !== null) {
        window.clearTimeout(comboTimerRef.current);
      }
      comboResetAtRef.current = now + COMBO_RESET_MS;
      comboTimerRef.current = window.setTimeout(
        resetCombo,
        COMBO_RESET_MS,
      );

      let completedOrder = false;
      if (activePreset.showOrders && tier === state.order.tier) {
        state.progress += 1;
        if (state.progress >= state.order.count) {
          const reward = state.order.reward;
          const persistentOrder = usesPersistentMetaProgress(activePreset.mode);
          if (persistentOrder) {
            state.coins += reward;
          }
          state.orderNo += 1;
          state.order = makeOrder(state.orderNo);
          state.progress = 0;
          state.runOrdersCompleted += 1;
          completedOrder = true;
          emitTelemetry({
            name: 'order_complete',
            ...telemetryContext,
            orderNo: state.orderNo - 1,
            reward: persistentOrder ? reward : 0,
          });
          if (persistentOrder) {
            storageSet(COINS_KEY, String(state.coins));
            storageSet(ORDER_KEY, String(state.orderNo));
            flash('Order complete +' + String(reward));
          } else {
            flash('Order complete');
          }
          playSound('order');
          haptic('order');
        }
      }

      const completedExperiment = completeExperimentIfGoalMet();
      if (completedExperiment) {
        playSound('order');
        haptic('order');
      } else if (!completedOrder) {
        playSound('merge');
        haptic('merge');
      }
      sync();
    };

    const onImpact = (strength: number) => {
      const now = performance.now();
      if (strength > 185 && now - lastBounce > 90) {
        lastBounce = now;
        playSound('bounce');
      }
    };

    const draw = (time: number) => {
      drawTank(ctx, glassGradient);

      const danger =
        dangerRef.current === null
          ? 0
          : Math.min(1, (time - dangerRef.current) / DANGER_GRACE_MS);
      if (danger > 0) {
        ctx.fillStyle = 'rgba(205,55,67,' + String(0.06 + danger * 0.15) + ')';
        ctx.fillRect(LEFT_WALL + 2, DANGER_Y - 12, RIGHT_WALL - LEFT_WALL - 4, 24);
      }
      ctx.strokeStyle = danger > 0 ? 'rgba(196,58,58,.96)' : 'rgba(255,255,255,.84)';
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = danger > 0 ? 2.4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL + 8, DANGER_Y);
      ctx.lineTo(RIGHT_WALL - 8, DANGER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (danger > 0 && dangerRef.current !== null) {
        const remaining = Math.max(
          0,
          (DANGER_GRACE_MS - (time - dangerRef.current)) / 1000,
        );
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(112,26,31,.9)';
        ctx.fillText('SAVE IT  ' + remaining.toFixed(1), WIDTH / 2, DANGER_Y + 24);
        ctx.restore();
      }

      const tier = uiRef.current.currentTier;
      const def = TIER_DEFS[tier]!;
      let guideY = FLOOR_Y - def.radius - 2;
      for (const body of worldRef.current.bodies) {
        const dx = Math.abs(body.x - aimXRef.current);
        const combined = body.r + def.radius;
        if (dx >= combined) continue;
        const offset = Math.sqrt(Math.max(0, combined * combined - dx * dx));
        const y = body.y - offset - 2;
        if (y > 95) guideY = Math.min(guideY, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.93)';
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(aimXRef.current, 86 + def.radius);
      ctx.lineTo(aimXRef.current, guideY);
      ctx.stroke();
      ctx.setLineDash([]);

      const bodies = worldRef.current.bodies;
      for (const bucket of tierBuckets) bucket.length = 0;
      for (const body of bodies) {
        tierBuckets[body.tier]?.push(body);
      }

      for (const body of bodies) {
        let gazeX = aimXRef.current;
        let gazeY = 77;
        let attention = 0.2;
        const bodySpeed = Math.hypot(body.vx, body.vy);

        if (bodySpeed > 220) {
          gazeX = body.x + body.vx * 0.14;
          gazeY = body.y + body.vy * 0.14;
          attention = 0.34;
        }

        let nearest = Infinity;
        for (const other of tierBuckets[body.tier] ?? []) {
          if (other.id === body.id) continue;
          const dx = other.x - body.x;
          const dy = other.y - body.y;
          const distance = Math.hypot(dx, dy);
          const reach = (body.r + other.r) * 1.85;
          if (distance < reach && distance < nearest) {
            nearest = distance;
            gazeX = other.x;
            gazeY = other.y;
            attention = Math.max(0.48, 1 - distance / reach);
          }
        }

        drawMonster(ctx, body, time, 1, gazeX, gazeY, attention);
      }

      if (
        !uiRef.current.gameOver &&
        !uiRef.current.experimentComplete &&
        !uiRef.current.experimentFailed
      ) {
        let previewGazeX = aimXRef.current;
        let previewGazeY = guideY;
        let previewAttention = 0.3;
        let previewNearest = Infinity;
        for (const body of bodies) {
          const dx = body.x - aimXRef.current;
          const dy = body.y - 77;
          const distance = Math.hypot(dx, dy);
          if (distance < previewNearest) {
            previewNearest = distance;
            previewGazeX = body.x;
            previewGazeY = body.y;
            previewAttention = 0.72;
          }
        }
        drawMonster(
          ctx,
          {
            id: -100 - tier,
            tier,
            x: aimXRef.current,
            y: 77,
            r: def.radius,
            angle: REDUCED_MOTION
              ? 0
              : Math.sin(time * 0.002) * 0.028,
            impact: 0,
            pressure: 0,
          },
          time,
          uiRef.current.canDrop ? 1 : 0.5,
          previewGazeX,
          previewGazeY,
          previewAttention,
        );
      }

      const bursts = burstsRef.current;
      let writeIndex = 0;
      for (let readIndex = 0; readIndex < bursts.length; readIndex += 1) {
        const burst = bursts[readIndex]!;
        if (time - burst.start < 560) {
          bursts[writeIndex] = burst;
          writeIndex += 1;
        }
      }
      bursts.length = writeIndex;

      for (const burst of bursts) {
        const age = (time - burst.start) / 520;
        if (age < 0 || age > 1) continue;
        const color = TIER_DEFS[burst.tier]!.accent;
        ctx.save();
        ctx.globalAlpha = (1 - age) * 0.75;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5 * (1 - age) + 1;
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, 13 + age * (28 + burst.tier * 4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const loopController = createFixedStepGameLoop({
      isPaused: () => paused,
      onStep: (time, stepSeconds) => {
        if (!uiRef.current.gameOver && !uiRef.current.experimentFailed) {
          stepWorld(worldRef.current, stepSeconds, time, onMerge, onImpact);
        }
      },
      onFrame: (time) => {
        if (
          uiRef.current.overdriveActive &&
          time >= overdriveEndRef.current
        ) {
          uiRef.current.overdriveActive = false;
          uiRef.current.overdrive = 0;
          emitTelemetry({
            name: 'overdrive_end',
            ...getTelemetryContext(presetRef.current),
            score: uiRef.current.score,
          });
          sync();
        }
  
        if (
          !uiRef.current.gameOver &&
          !uiRef.current.experimentComplete &&
          !uiRef.current.experimentFailed
        ) {
          const offender = worldRef.current.bodies.some((body) => {
            const speed = Math.hypot(body.vx, body.vy);
            return time - body.bornAt > 900 && body.y - body.r < DANGER_Y && speed < 70;
          });
          if (offender) {
            if (dangerRef.current === null) {
              dangerRef.current = time;
              runDangerStartsRef.current += 1;
              emitTelemetry({
                name: 'danger_started',
                ...getTelemetryContext(presetRef.current),
                score: uiRef.current.score,
                count: runDangerStartsRef.current,
              });
            }
            if (time - dangerRef.current > DANGER_GRACE_MS) {
              uiRef.current.gameOver = true;
              uiRef.current.canDrop = false;
              storageRemove(ACTIVE_RUN_KEY);
              if (usesPersistentMetaProgress(presetRef.current.mode)) {
                uiRef.current.bestScore = Math.max(
                  uiRef.current.bestScore,
                  uiRef.current.score,
                );
                storageSet(BEST_SCORE_KEY, String(uiRef.current.bestScore));
              }
              emitTelemetry({
                name: 'game_over',
                ...getTelemetryContext(presetRef.current),
                score: uiRef.current.score,
                highestTier: uiRef.current.runHighestTier,
                metrics: getTerminalMetrics(),
              });
              sync();
              playSound('fail');
              haptic('fail');
            }
          } else {
            const dangerStartedAt = dangerRef.current;
            dangerRef.current = null;
            if (dangerStartedAt !== null) {
              emitTelemetry({
                name: 'danger_end',
                ...getTelemetryContext(presetRef.current),
                rescued:
                  time - dangerStartedAt >= 250 &&
                  isPileBelowDanger(),
                score: uiRef.current.score,
              });
            }
            if (
              dangerStartedAt !== null &&
              time - dangerStartedAt >= 250 &&
              isPileBelowDanger() &&
              !uiRef.current.experimentComplete &&
              !uiRef.current.experimentFailed
            ) {
              uiRef.current.runRescues += 1;
              emitTelemetry({
                name: 'rescued',
                ...getTelemetryContext(presetRef.current),
                score: uiRef.current.score,
                rescues: uiRef.current.runRescues,
                dangerDurationMs: time - dangerStartedAt,
              });
              const completedExperiment = completeExperimentIfGoalMet();
              sync();
              if (completedExperiment) {
                playSound('order');
                haptic('order');
              }
            } else if (completeExperimentIfGoalMet()) {
              sync();
              playSound('order');
              haptic('order');
            }
          }
        }
  
        draw(time);
      },
    });
    loopController.start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      loopController.stop();
    };
  }, [
    completeExperimentIfGoalMet,
    finishDropCooldown,
    getTerminalMetrics,
    flash,
    isPileBelowDanger,
    resetCombo,
    resolveDropLimit,
    runElapsedMs,
    sync,
  ]);

  useEffect(() => () => {
    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    if (comboTimerRef.current !== null) window.clearTimeout(comboTimerRef.current);
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    if (limitTimerRef.current !== null) window.clearTimeout(limitTimerRef.current);
    dropReadyAtRef.current = null;
    comboResetAtRef.current = null;
    limitResolveAtRef.current = null;
    overdriveEndRef.current = 0;
  }, []);

  useEffect(() => {
    const rememberBackgroundFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('[role="dialog"]')) return;
      dialogReturnFocusRef.current = event.target;
    };
    document.addEventListener('focusin', rememberBackgroundFocus);
    return () =>
      document.removeEventListener('focusin', rememberBackgroundFocus);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowMonsters(false);
      setShowShop(false);
      setShowLab(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const dialogOpen =
      showMonsters ||
      showShop ||
      showLab ||
      ui.experimentComplete ||
      ui.experimentFailed ||
      ui.gameOver;
    if (!dialogOpen) return;

    const shell = canvasRef.current?.closest('.game-shell');
    const dialog =
      shell?.querySelector<HTMLElement>('.monster-modal[role="dialog"]') ??
      shell?.querySelector<HTMLElement>('.game-over[role="dialog"]') ??
      null;
    if (!shell || !dialog) return;

    const previousFocus = dialogReturnFocusRef.current;
    const inertTargets: HTMLElement[] = [];
    let activeLayer: HTMLElement | null = dialog;

    while (activeLayer && activeLayer !== shell) {
      const parent = activeLayer.parentElement;
      if (!parent) break;

      for (const sibling of Array.from(parent.children)) {
        if (sibling === activeLayer || !(sibling instanceof HTMLElement)) {
          continue;
        }
        sibling.setAttribute('inert', '');
        sibling.setAttribute('aria-hidden', 'true');
        inertTargets.push(sibling);
      }
      activeLayer = parent;
    }

    const onModalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('inert'));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onModalKeyDown);
    return () => {
      document.removeEventListener('keydown', onModalKeyDown);
      for (const element of inertTargets) {
        element.removeAttribute('inert');
        element.removeAttribute('aria-hidden');
      }
      previousFocus?.focus();
    };
  }, [
    showLab,
    showMonsters,
    showShop,
    ui.experimentComplete,
    ui.experimentFailed,
    ui.gameOver,
  ]);

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
      const state = uiRef.current;
      const radius = TIER_DEFS[state.currentTier]!.radius;
      const minX = LEFT_WALL + radius + 2;
      const maxX = RIGHT_WALL - radius - 2;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -14 : 14;
        aimXRef.current = Math.max(
          minX,
          Math.min(maxX, aimXRef.current + delta),
        );
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        aimXRef.current = event.key === 'Home' ? minX : maxX;
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        drop();
        return;
      }

      if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        hold();
      }
    },
    [drop, hold],
  );

  const toggleSound = () => {
    const next = !uiRef.current.sound;
    setSoundEnabled(next);
    uiRef.current.sound = next;
    sync();
    if (next) playSound('ui');
  };

  const orders = [ui.order, makeOrder(ui.orderNo + 1), makeOrder(ui.orderNo + 2)];
  const persistentMetaEnabled = usesPersistentMetaProgress(preset.mode);
  const persistentOrdersCompleted = Math.max(0, readInt(ORDER_KEY, 1) - 1);
  const objectiveProgress = goalProgressText(
    preset.goal,
    getRunGoalContext(ui, isPileBelowDanger()),
  );
  const powerUsesRemaining = !preset.allowPower
    ? 0
    : preset.mode === 'experiments' && preset.limits?.powerUses !== undefined
      ? Math.max(0, preset.limits.powerUses - ui.runPowerUses)
      : ui.powerCharges;

  return (
    <main className="app-shell">
      <section className={'game-shell' + (ui.overdriveActive ? ' is-overdrive' : '')}>
        <div className="top-actions concept-top-actions">
          <div className="coin-pill" aria-label={String(ui.coins) + ' coins'}>
            <span className="coin">●</span>
            <strong>{ui.coins.toLocaleString()}</strong>
          </div>
          <button className="icon-button" onClick={toggleSound} aria-label={'Sound ' + (ui.sound ? 'on' : 'off')}>
            {ui.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </div>

        <div
          className="next-board"
          role="group"
          aria-label={
            'Next monster tier ' +
            String(ui.nextTier + 1) +
            ', then tier ' +
            String(ui.afterNextTier + 1)
          }
        >
          <strong>NEXT</strong>
          <MonsterArt tier={ui.nextTier} size={60} />
          <span className="after-next" aria-hidden="true">
            <small>+1</small>
            <MonsterArt tier={ui.afterNextTier} size={30} />
          </span>
        </div>

        <button
          type="button"
          className={
            'hold-board' +
            (!ui.canHold ? ' is-used' : '') +
            (ui.canHold &&
            ui.holdTier !== null &&
            ui.holdTier !== ui.currentTier
              ? ' is-swap-ready'
              : '')
          }
          onClick={hold}
          disabled={
            !preset.allowHold ||
            !ui.canDrop ||
            !ui.canHold ||
            ui.gameOver ||
            ui.experimentComplete ||
            ui.experimentFailed ||
            (preset.limits?.holdUses !== undefined &&
              ui.runHoldUses >= preset.limits.holdUses)
          }
          aria-label={
            !preset.allowHold
              ? 'Hold unavailable in this mode'
              : ui.holdTier === null
                ? 'Hold current monster'
                : 'Swap current monster with held monster'
          }
        >
          <span>{!preset.allowHold ? 'LOCKED' : ui.canHold ? 'HOLD' : 'USED'}</span>
          {ui.holdTier === null ? <b>+</b> : <MonsterArt tier={ui.holdTier} size={42} />}
        </button>

        <div className="status-cluster">
          <div className="score-plaque">
            <span>{preset.mode === 'daily' ? 'DAILY SCORE' : 'SCORE'}</span>
            <strong>{ui.score}</strong>
            {ui.bestCombo > 1 && <small>BEST ×{ui.bestCombo}</small>}
          </div>
          {preset.allowOverdrive ? (
            <div
              className={'overdrive-panel' + (ui.overdriveActive ? ' is-active' : '')}
              aria-label={
                ui.overdriveActive
                  ? 'Lab Overdrive active, double score'
                  : 'Lab Overdrive ' + String(ui.overdrive) + ' percent'
              }
            >
              <span>{ui.overdriveActive ? 'OVERDRIVE ×2' : 'OVERDRIVE'}</span>
              <i>
                <b style={{ width: (ui.overdriveActive ? 100 : ui.overdrive) + '%' }} />
              </i>
            </div>
          ) : (
            <div className="mode-status" aria-label={preset.title + ', ' + preset.subtitle}>
              {preset.title} · {preset.subtitle}
            </div>
          )}
        </div>

        {preset.showOrders ? (
          <section className="orders-board" aria-label="Orders">
            <h2>ORDERS</h2>
            {orders.map((order, index) => (
              <div className={'order-row ' + (index === 0 ? 'current' : '')} key={String(ui.orderNo) + '-' + String(index)}>
                <MonsterArt tier={order.tier} size={34} />
                <span>{index === 0 ? ui.progress : 0}/{order.count}</span>
                <b>● +{order.reward}</b>
              </div>
            ))}
            <div className="order-track" aria-hidden="true">
              <i style={{ width: String(Math.min(100, (ui.progress / ui.order.count) * 100)) + '%' }} />
            </div>
          </section>
        ) : (
          <section className="orders-board mode-objective-board" aria-label={preset.title + ' objective'}>
            <h2>{preset.mode === 'daily' ? 'DAILY' : 'GOAL'}</h2>
            <div className="mode-objective">
              <strong>
                {preset.mode === 'daily'
                  ? 'FAIR RUN'
                  : preset.goal?.label ?? preset.subtitle}
              </strong>
              <span>
                {preset.mode === 'daily'
                  ? preset.dailyKey
                  : ui.experimentComplete
                    ? 'COMPLETE'
                    : preset.goal
                      ? preset.goal.hint + (objectiveProgress ? ' · ' + objectiveProgress : '')
                      : preset.subtitle}
              </span>
            </div>
          </section>
        )}

        <div className="game-frame">
          <div className="canvas-wrap">
            <canvas
              ref={canvasRef}
              className="physics-canvas"
              tabIndex={0}
              aria-label="Monster tank. Drag horizontally and release to drop. Keyboard: left and right arrows aim, Space or Enter drops, H holds."
              onKeyDown={handleCanvasKeyDown}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateAim(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons || event.pointerType === 'touch') updateAim(event);
              }}
              onPointerUp={(event) => {
                updateAim(event);
                drop();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
            />
            {coach && !ui.gameOver && !ui.experimentFailed && (
              <button className="coach" onClick={() => { storageSet(COACH_KEY, 'done'); setCoach(false); }}>
                Drag to aim · release to drop · match identical monsters to merge
              </button>
            )}
            {ui.combo > 1 && <div className="combo-badge">CHAIN ×{ui.combo}</div>}
            {ui.message && <div className="toast" role="status">{ui.message}</div>}
            <RunOverlays
              mode={preset.mode}
              score={ui.score}
              bestScore={ui.bestScore}
              presetTitle={preset.title}
              dailyKey={preset.dailyKey}
              successLabel={preset.goal?.successLabel}
              experimentComplete={ui.experimentComplete}
              experimentFailed={ui.experimentFailed}
              gameOver={ui.gameOver}
              onRetry={restart}
              onNextExperiment={
                preset.mode === 'experiments' &&
                preset.experimentId &&
                getNextExperimentId(preset.experimentId)
                  ? () =>
                      resetRun(
                        'experiments',
                        getNextExperimentId(preset.experimentId!)!,
                      )
                  : undefined
              }
              onLab={() => setShowLab(true)}
            />
          </div>
        </div>

        <GameToolbar
          preset={preset}
          canDrop={ui.canDrop}
          gameOver={ui.gameOver}
          experimentComplete={ui.experimentComplete}
          experimentFailed={ui.experimentFailed}
          runPowerUses={ui.runPowerUses}
          powerCharges={ui.powerCharges}
          powerUsesRemaining={powerUsesRemaining}
          onShop={() => setShowShop(true)}
          onMonsters={() => setShowMonsters(true)}
          onDrop={drop}
          onPower={nudge}
          onLab={() => setShowLab(true)}
        />

        {showMonsters && (
          <MonstersModal
            bestTier={ui.bestTier}
            onClose={() => setShowMonsters(false)}
          />
        )}

        {showShop && (
          <ShopModal
            persistentMetaEnabled={persistentMetaEnabled}
            coins={ui.coins}
            powerCharges={ui.powerCharges}
            powerCost={POWER_COST}
            onBuyPower={buyPower}
            onClose={() => setShowShop(false)}
          />
        )}

        {showLab && (
          <LabModal
            preset={preset}
            experimentComplete={ui.experimentComplete}
            experimentsCompleted={experimentsCompleted}
            bestScore={ui.bestScore}
            persistentOrdersCompleted={persistentOrdersCompleted}
            bestTier={ui.bestTier}
            coins={ui.coins}
            onStartMode={startMode}
            onClose={() => setShowLab(false)}
          />
        )}
      </section>
    </main>
  );
}

export default App;

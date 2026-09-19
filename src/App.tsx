import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
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
  DANGER_GRACE_MS,
  DROP_COOLDOWN_MS,
  OVERDRIVE_DURATION_MS,
  OVERDRIVE_MAX,
  drawSpawnTier,
  getOverdriveExtensionMs,
  getOverdriveGain,
  makeOrder,
  type Order,
} from './gameplay';
import { haptic } from './haptics';
import {
  MODE_OPTIONS,
  createSeededRandom,
  getRunPreset,
  type GameMode,
  type RunPreset,
} from './modes';
import {
  formatGoalProgress,
  isGoalComplete,
  type RunMetrics,
} from './objectives';
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
import { storageGet, storageSet } from './storage';

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
  experimentFailureReason: string;
  runHighestTier: number;
  merges: number;
  ordersCompletedRun: number;
  rescues: number;
  drops: number;
  holdUses: number;
  powerUses: number;
};

const COINS_KEY = 'monster-merge-coins-v3';
const BEST_SCORE_KEY = 'monster-merge-best-score-v3';
const BEST_TIER_KEY = 'monster-merge-best-tier-v3';
const ORDER_KEY = 'monster-merge-order-v3';
const COACH_KEY = 'monster-merge-coach-v3';
const POWER_KEY = 'monster-merge-power-v1';
const POWER_COST = 200;
const DANGER_RESCUE_MIN_MS = 300;
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HYBRID_ATLAS_URL = '/assets/monster-atlas-v1.webp';
const HYBRID_TIER_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 7];
const HYBRID_IRIS = [
  '#245ee8',
  '#13a757',
  '#7230a8',
  '#6b3519',
  '#a84a16',
  '#7831b5',
  '#1977df',
  '#7f4b25',
  '#7f4b25',
];

const hybridAtlas = new Image();
hybridAtlas.decoding = 'async';
hybridAtlas.src = HYBRID_ATLAS_URL;

type FaceMode = 'normal' | 'cyclops' | 'closed' | 'wink';

function faceMode(tier: number): FaceMode {
  if (tier === 1 || tier === 6) return 'cyclops';
  if (tier === 3) return 'closed';
  if (tier >= 7) return 'wink';
  return 'normal';
}

function readInt(key: string, fallback = 0) {
  const value = Number(storageGet(key));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function atlasIndex(tier: number) {
  return HYBRID_TIER_MAP[Math.min(MAX_TIER, tier)] ?? 7;
}

function atlasPosition(index: number) {
  return {
    column: index % 4,
    row: Math.floor(index / 4),
  };
}

function MonsterArt({ tier, size = 42 }: { tier: number; size?: number }) {
  const index = atlasIndex(tier);
  const { column, row } = atlasPosition(index);
  const mode = faceMode(tier);
  return (
    <span
      className={'monster-art face-' + mode}
      data-tier={tier}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <span
        className="monster-body"
        style={{
          backgroundImage: 'url(' + HYBRID_ATLAS_URL + ')',
          backgroundSize: '400% 200%',
          backgroundPosition:
            String((column / 3) * 100) + '% ' + String(row * 100) + '%',
        }}
      />
      <span className="thumb-eye thumb-eye-left"><i /></span>
      <span className="thumb-eye thumb-eye-right"><i /></span>
      <span className="thumb-mouth" />
    </span>
  );
}

function drawTank(
  ctx: CanvasRenderingContext2D,
  glass: CanvasGradient,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const top = 116;
  ctx.fillStyle = glass;
  ctx.fillRect(LEFT_WALL, top, RIGHT_WALL - LEFT_WALL, FLOOR_Y - top);
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  pupilX: number,
  pupilY: number,
  pupilRadius: number,
  iris: string,
) {
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(72,40,45,.22)';
  ctx.lineWidth = Math.max(0.7, rx * 0.07);
  ctx.stroke();

  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x + pupilX, y + pupilY, pupilRadius * 1.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14203c';
  ctx.beginPath();
  ctx.arc(x + pupilX, y + pupilY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(
    x + pupilX - pupilRadius * 0.32,
    y + pupilY - pupilRadius * 0.36,
    pupilRadius * 0.27,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawClosedEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) {
  ctx.strokeStyle = '#4e2638';
  ctx.lineWidth = Math.max(1.3, width * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.quadraticCurveTo(x, y - width * 0.34, x + width / 2, y);
  ctx.stroke();
}

function drawRuntimeFace(
  ctx: CanvasRenderingContext2D,
  body: Pick<Body, 'id' | 'tier' | 'x' | 'y'> & {
    pressure?: number;
    impact?: number;
  },
  radius: number,
  time: number,
  gazeTargetX = body.x,
  gazeTargetY = body.y,
  attention = 0,
) {
  const tier = Math.min(MAX_TIER, body.tier);
  const mode = faceMode(tier);
  const pressure = Math.min(1, body.pressure ?? 0);
  const impact = Math.min(1, body.impact ?? 0);
  const attentionLevel = Math.min(1, attention);
  const nervous = pressure > 0.42;
  const blink =
    !nervous &&
    ((time * 0.001 + body.id * 0.83) % (3.15 + (Math.abs(body.id) % 4) * 0.22)) <
      0.13;

  const targetX = gazeTargetX - body.x;
  const targetY = gazeTargetY - body.y;
  const targetLength = Math.max(1, Math.hypot(targetX, targetY));
  const gazeScaleX = radius * (0.055 + attentionLevel * 0.025);
  const gazeScaleY = radius * (0.04 + attentionLevel * 0.018);
  const idleWeight = Math.max(0, 1 - attentionLevel);
  const idleGazeX =
    Math.sin(time * 0.00135 + body.id * 1.31) * radius * 0.027 * idleWeight;
  const idleGazeY =
    Math.cos(time * 0.00105 + body.id * 0.73) * radius * 0.018 * idleWeight;
  const gazeX = (targetX / targetLength) * gazeScaleX + idleGazeX;
  const gazeY = (targetY / targetLength) * gazeScaleY + idleGazeY;
  const eyeY = -radius * (nervous ? 0.15 : 0.13);
  const iris = HYBRID_IRIS[tier] ?? '#315ed8';

  if (mode === 'closed') {
    drawClosedEye(ctx, -radius * 0.24, eyeY, radius * 0.25);
    drawClosedEye(ctx, radius * 0.24, eyeY, radius * 0.25);
  } else if (mode === 'cyclops') {
    if (blink) {
      drawClosedEye(ctx, 0, eyeY, radius * 0.42);
    } else {
      drawEye(
        ctx,
        0,
        eyeY,
        radius * 0.34,
        radius * (nervous ? 0.28 : 0.36),
        gazeX * 1.2,
        gazeY,
        radius * 0.14,
        iris,
      );
    }
  } else if (mode === 'wink') {
    if (blink) {
      drawClosedEye(ctx, -radius * 0.23, eyeY, radius * 0.24);
    } else {
      drawEye(
        ctx,
        -radius * 0.23,
        eyeY,
        radius * 0.22,
        radius * 0.28,
        gazeX,
        gazeY,
        radius * 0.095,
        iris,
      );
    }
    drawClosedEye(ctx, radius * 0.24, eyeY + radius * 0.015, radius * 0.23);
  } else if (blink) {
    drawClosedEye(ctx, -radius * 0.23, eyeY, radius * 0.23);
    drawClosedEye(ctx, radius * 0.23, eyeY, radius * 0.23);
  } else {
    const eyeRy = radius * (nervous ? 0.235 : 0.28);
    drawEye(
      ctx,
      -radius * 0.23,
      eyeY,
      radius * 0.215,
      eyeRy,
      gazeX,
      gazeY,
      radius * 0.095,
      iris,
    );
    drawEye(
      ctx,
      radius * 0.23,
      eyeY,
      radius * 0.215,
      eyeRy,
      gazeX,
      gazeY,
      radius * 0.095,
      iris,
    );
  }

  if (tier === 0 || tier === 2 || tier === 3) {
    ctx.fillStyle = 'rgba(255,112,144,.34)';
    ctx.beginPath();
    ctx.arc(-radius * 0.52, radius * 0.12, radius * 0.095, 0, Math.PI * 2);
    ctx.arc(radius * 0.52, radius * 0.12, radius * 0.095, 0, Math.PI * 2);
    ctx.fill();
  }

  if (nervous) {
    ctx.strokeStyle = '#5c2939';
    ctx.lineWidth = Math.max(1.3, radius * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.17, radius * 0.28);
    ctx.quadraticCurveTo(
      -radius * 0.05,
      radius * 0.21,
      0,
      radius * 0.3,
    );
    ctx.quadraticCurveTo(
      radius * 0.06,
      radius * 0.39,
      radius * 0.18,
      radius * 0.29,
    );
    ctx.stroke();
    if (pressure > 0.62) {
      ctx.fillStyle = 'rgba(190,242,255,.92)';
      ctx.beginPath();
      ctx.ellipse(
        radius * 0.58,
        -radius * 0.31,
        radius * 0.065,
        radius * 0.115,
        -0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    return;
  }

  ctx.fillStyle = '#5c2031';
  ctx.beginPath();
  if (attentionLevel > 0.72 || impact > 0.52) {
    ctx.ellipse(
      0,
      radius * 0.25,
      radius * 0.155,
      radius * 0.18,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    ctx.arc(
      0,
      radius * 0.19,
      radius * 0.23,
      0.07 * Math.PI,
      0.93 * Math.PI,
    );
    ctx.lineTo(-radius * 0.23, radius * 0.19);
  }
  ctx.fill();

  ctx.fillStyle = '#ff6475';
  ctx.beginPath();
  ctx.ellipse(
    0,
    radius * 0.31,
    radius * 0.105,
    radius * 0.07,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (tier === 2 || tier === 4 || tier === 5 || tier === 6) {
    ctx.fillStyle = '#fff8eb';
    const fangY = radius * 0.18;
    const fangSize = radius * 0.1;
    for (const x of tier === 6 ? [-0.13, 0.13] : [-0.11]) {
      ctx.beginPath();
      ctx.moveTo(x * radius - fangSize * 0.45, fangY);
      ctx.lineTo(x * radius + fangSize * 0.45, fangY);
      ctx.lineTo(x * radius, fangY + fangSize);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawMonster(
  ctx: CanvasRenderingContext2D,
  body: Pick<Body, 'id' | 'tier' | 'x' | 'y' | 'r' | 'angle' | 'impact' | 'pressure'> &
    Partial<Pick<Body, 'vx' | 'vy'>>,
  time: number,
  alpha = 1,
  gazeX = body.x,
  gazeY = body.y,
  attention = 0,
) {
  const index = atlasIndex(body.tier);
  const { column, row } = atlasPosition(index);
  const speed = Math.hypot(body.vx ?? 0, body.vy ?? 0);
  const idle =
    !REDUCED_MOTION && speed < 70
      ? Math.sin(time * 0.0021 + body.id * 1.19)
      : 0;
  const pressure = Math.min(1, body.pressure ?? 0);
  const impact = Math.min(1, body.impact ?? 0);
  const motionScale = REDUCED_MOTION ? 0.6 : 1;
  const squash = (impact * 0.075 + pressure * 0.035) * motionScale;
  const breathe = idle * 0.018 * (1 - pressure) * motionScale;
  const nervous =
    !REDUCED_MOTION && pressure > 0.46
      ? Math.sin(time * 0.025 + body.id) * 0.018
      : 0;
  const radius = body.r * (body.tier >= 5 ? 1.08 : 1.12);
  const size = radius * 2.46;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(body.x, body.y);
  ctx.rotate(body.angle + nervous);
  ctx.scale(1 + squash - breathe * 0.18, 1 - squash + breathe);

  if (hybridAtlas.complete && hybridAtlas.naturalWidth > 0) {
    const sw = hybridAtlas.naturalWidth / 4;
    const sh = hybridAtlas.naturalHeight / 2;
    ctx.drawImage(
      hybridAtlas,
      column * sw,
      row * sh,
      sw,
      sh,
      -size / 2,
      -size / 2,
      size,
      size,
    );
  } else {
    ctx.fillStyle = TIER_DEFS[body.tier]!.base;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRuntimeFace(ctx, body, radius, time, gazeX, gazeY, attention);
  ctx.restore();
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
  const worldRef = useRef<World>({ bodies: [] });
  const aimXRef = useRef(WIDTH / 2);
  const dropTimerRef = useRef<number | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const dangerRef = useRef<number | null>(null);
  const lastDropAtRef = useRef(-Infinity);
  const lastMergeRef = useRef(-Infinity);
  const burstsRef = useRef<Burst[]>([]);
  const spawnBagRef = useRef<number[]>([]);
  const fixedQueueRef = useRef<number[]>([]);
  const randomRef = useRef<() => number>(Math.random);
  const presetRef = useRef<RunPreset>(getRunPreset('endless'));
  const overdriveEndRef = useRef(0);

  const initialOrderNo = Math.max(1, readInt(ORDER_KEY, 1));
  const initialBestTier = readInt(BEST_TIER_KEY, 0);
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
      experimentFailureReason: '',
      runHighestTier: 0,
      merges: 0,
      ordersCompletedRun: 0,
      rescues: 0,
      drops: 0,
      holdUses: 0,
      powerUses: 0,
    };
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const sync = useCallback(() => setUi({ ...uiRef.current }), []);

  const getRunMetrics = useCallback((): RunMetrics => {
    const state = uiRef.current;
    return {
      score: state.score,
      highestTier: state.runHighestTier,
      bestCombo: state.bestCombo,
      merges: state.merges,
      ordersCompleted: state.ordersCompletedRun,
      rescues: state.rescues,
      pileBelowDanger: worldRef.current.bodies.every(
        (body) => body.y - body.r >= DANGER_Y,
      ),
    };
  }, []);

  const failExperiment = useCallback((reason: string) => {
    const state = uiRef.current;
    if (
      presetRef.current.mode !== 'experiments' ||
      state.experimentComplete ||
      state.experimentFailed ||
      state.gameOver
    ) {
      return false;
    }

    state.experimentFailed = true;
    state.experimentFailureReason = reason;
    state.canDrop = false;
    sync();
    playSound('fail');
    haptic('fail');
    return true;
  }, [sync]);

  const completeExperimentIfReady = useCallback(() => {
    const state = uiRef.current;
    const activePreset = presetRef.current;
    if (
      activePreset.mode !== 'experiments' ||
      !activePreset.goal ||
      state.experimentComplete ||
      state.experimentFailed ||
      state.gameOver
    ) {
      return false;
    }

    if (!isGoalComplete(activePreset.goal, getRunMetrics())) return false;

    state.experimentComplete = true;
    state.canDrop = false;
    sync();
    playSound('order');
    haptic('order');
    return true;
  }, [getRunMetrics, sync]);

  useEffect(() => {
    installAudioUnlock();
  }, []);

  const flash = useCallback((message: string) => {
    uiRef.current.message = message;
    sync();
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => {
      uiRef.current.message = '';
      sync();
    }, 1100);
  }, [sync]);

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
    const activePreset = presetRef.current;
    if (
      !state.canDrop ||
      state.gameOver ||
      state.experimentComplete ||
      state.experimentFailed
    ) {
      return;
    }
    if (
      activePreset.maxDrops !== undefined &&
      state.drops >= activePreset.maxDrops
    ) {
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

    const droppedAt = performance.now();
    worldRef.current.bodies.push(spawnBody(tier, x, 82, droppedAt));
    lastDropAtRef.current = droppedAt;
    state.drops += 1;
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

    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    dropTimerRef.current = window.setTimeout(() => {
      const current = uiRef.current;
      const currentPreset = presetRef.current;
      const hasDropsRemaining =
        currentPreset.maxDrops === undefined ||
        current.drops < currentPreset.maxDrops;
      if (
        !current.gameOver &&
        !current.experimentComplete &&
        !current.experimentFailed &&
        hasDropsRemaining
      ) {
        current.canDrop = true;
        sync();
      }
    }, DROP_COOLDOWN_MS);
  }, [coach, flash, sync]);

  const resetRun = useCallback((mode: GameMode, experimentId?: string) => {
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
    lastDropAtRef.current = -Infinity;
    lastMergeRef.current = -Infinity;
    overdriveEndRef.current = 0;
    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    if (comboTimerRef.current !== null) window.clearTimeout(comboTimerRef.current);

    const state = uiRef.current;
    state.score = 0;
    state.progress = 0;
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
    state.experimentFailureReason = '';
    state.runHighestTier = 0;
    state.merges = 0;
    state.ordersCompletedRun = 0;
    state.rescues = 0;
    state.drops = 0;
    state.holdUses = 0;
    state.powerUses = 0;
    aimXRef.current = WIDTH / 2;
    sync();
    playSound('restart');
    haptic('restart');
  }, [sync]);

  const restart = useCallback(() => {
    resetRun(presetRef.current.mode, presetRef.current.experimentId);
  }, [resetRun]);

  const startMode = useCallback((mode: GameMode) => {
    resetRun(mode);
    setShowLab(false);
  }, [resetRun]);

  const hold = useCallback(() => {
    const state = uiRef.current;
    const activePreset = presetRef.current;
    if (
      !activePreset.allowHold ||
      !state.canDrop ||
      !state.canHold ||
      state.gameOver ||
      state.experimentComplete ||
      state.experimentFailed ||
      (activePreset.maxHoldUses !== undefined &&
        state.holdUses >= activePreset.maxHoldUses)
    ) {
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
    state.holdUses += 1;
    sync();
    playSound('ui');
    haptic('drop');
  }, [flash, sync]);

  const buyPower = useCallback(() => {
    const state = uiRef.current;
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
    const activePreset = presetRef.current;
    if (!activePreset.allowPower) {
      flash('Power unavailable in this mode');
      return;
    }
    if (
      state.gameOver ||
      state.experimentComplete ||
      state.experimentFailed ||
      (activePreset.maxPowerUses !== undefined &&
        state.powerUses >= activePreset.maxPowerUses)
    ) {
      return;
    }
    if (state.powerCharges <= 0) {
      setShowShop(true);
      flash('Get a Pulse in Shop');
      return;
    }
    if (worldRef.current.bodies.length === 0) {
      flash('Drop a monster first');
      return;
    }
    state.powerCharges -= 1;
    state.powerUses += 1;
    storageSet(POWER_KEY, String(state.powerCharges));
    sync();
    for (const body of worldRef.current.bodies) {
      const direction = body.x < WIDTH / 2 ? -1 : 1;
      body.vx += direction * (26 + Math.random() * 24);
      body.vy -= 24 + Math.random() * 18;
      body.impact = Math.max(body.impact, 0.28);
    }
    playSound('bounce');
    haptic('merge');
  }, [flash, sync]);

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

    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    let lastBounce = -Infinity;
    const tierBuckets = Array.from(
      { length: MAX_TIER + 1 },
      () => [] as Body[],
    );
    let paused = document.hidden;
    const onVisibility = () => {
      paused = document.hidden;
      previous = performance.now();
      accumulator = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onMerge = ({ tier, x, y }: { tier: number; x: number; y: number }) => {
      const state = uiRef.current;
      const now = performance.now();
      state.combo = now - lastMergeRef.current <= 1100
        ? Math.min(9, Math.max(1, state.combo) + 1)
        : 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.merges += 1;
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
      if (activePreset.allowOverdrive && !state.overdriveActive) {
        state.overdrive = Math.min(
          OVERDRIVE_MAX,
          state.overdrive + getOverdriveGain(tier, state.combo),
        );
        if (state.overdrive >= OVERDRIVE_MAX) {
          state.overdrive = 0;
          state.overdriveActive = true;
          overdriveEndRef.current = now + OVERDRIVE_DURATION_MS;
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
      state.bestTier = Math.max(state.bestTier, tier);
      state.bestScore = Math.max(state.bestScore, state.score);
      storageSet(BEST_TIER_KEY, String(state.bestTier));
      storageSet(BEST_SCORE_KEY, String(state.bestScore));
      burstsRef.current.push({ x, y, tier, start: now });
      if (burstsRef.current.length > 14) burstsRef.current.shift();

      if (comboTimerRef.current !== null) window.clearTimeout(comboTimerRef.current);
      comboTimerRef.current = window.setTimeout(() => {
        uiRef.current.combo = 0;
        sync();
      }, 1250);

      let orderCompleted = false;
      if (activePreset.showOrders && tier === state.order.tier) {
        state.progress += 1;
        if (state.progress >= state.order.count) {
          const reward = state.order.reward;
          state.coins += reward;
          state.orderNo += 1;
          state.ordersCompletedRun += 1;
          state.order = makeOrder(state.orderNo);
          state.progress = 0;
          storageSet(COINS_KEY, String(state.coins));
          storageSet(ORDER_KEY, String(state.orderNo));
          flash('Order complete +' + String(reward));
          orderCompleted = true;
        }
      }

      const completedExperiment = completeExperimentIfReady();
      if (!completedExperiment) {
        playSound(orderCompleted ? 'order' : 'merge');
        haptic(orderCompleted ? 'order' : 'merge');
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

      if (!uiRef.current.gameOver) {
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

    const loop = (time: number) => {
      if (paused) {
        previous = time;
        frame = requestAnimationFrame(loop);
        return;
      }
      const delta = Math.min(0.05, (time - previous) / 1000);
      previous = time;
      accumulator += delta;
      while (accumulator >= 1 / 120) {
        if (!uiRef.current.gameOver) stepWorld(worldRef.current, 1 / 120, time, onMerge, onImpact);
        accumulator -= 1 / 120;
      }

      if (
        uiRef.current.overdriveActive &&
        time >= overdriveEndRef.current
      ) {
        uiRef.current.overdriveActive = false;
        uiRef.current.overdrive = 0;
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
          if (dangerRef.current === null) dangerRef.current = time;
          if (time - dangerRef.current > DANGER_GRACE_MS) {
            if (presetRef.current.mode === 'experiments') {
              failExperiment('Danger line held too long');
            } else {
              uiRef.current.gameOver = true;
              uiRef.current.canDrop = false;
              uiRef.current.bestScore = Math.max(
                uiRef.current.bestScore,
                uiRef.current.score,
              );
              storageSet(BEST_SCORE_KEY, String(uiRef.current.bestScore));
              sync();
              playSound('fail');
              haptic('fail');
            }
          }
        } else {
          const dangerStartedAt = dangerRef.current;
          dangerRef.current = null;
          if (
            dangerStartedAt !== null &&
            time - dangerStartedAt >= DANGER_RESCUE_MIN_MS
          ) {
            uiRef.current.rescues += 1;
            if (!completeExperimentIfReady()) sync();
          }
        }

        completeExperimentIfReady();

        const activePreset = presetRef.current;
        if (
          activePreset.mode === 'experiments' &&
          activePreset.maxDrops !== undefined &&
          uiRef.current.drops >= activePreset.maxDrops &&
          time - lastDropAtRef.current >= 1200 &&
          !uiRef.current.experimentComplete &&
          !uiRef.current.experimentFailed
        ) {
          const settled = worldRef.current.bodies.every(
            (body) => Math.hypot(body.vx, body.vy) < 24,
          );
          if (settled && !completeExperimentIfReady()) {
            failExperiment('Drop limit reached');
          }
        }
      }

      draw(time);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(frame);
    };
  }, [completeExperimentIfReady, failExperiment, flash, sync]);

  useEffect(() => () => {
    if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    if (comboTimerRef.current !== null) window.clearTimeout(comboTimerRef.current);
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    overdriveEndRef.current = 0;
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
    const modalOpen = showMonsters || showShop || showLab;
    if (!modalOpen) return;

    const shell = canvasRef.current?.closest('.game-shell');
    const modal = shell?.querySelector<HTMLElement>(
      '.monster-modal[role="dialog"]',
    );
    if (!shell || !modal) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const inertTargets = Array.from(shell.children).filter(
      (element) => element !== modal,
    );

    for (const element of inertTargets) {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    }

    const onModalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
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
  }, [showLab, showMonsters, showShop]);

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
  const holdLimitReached =
    preset.maxHoldUses !== undefined && ui.holdUses >= preset.maxHoldUses;
  const powerLimitReached =
    preset.maxPowerUses !== undefined && ui.powerUses >= preset.maxPowerUses;
  const dropLimitReached =
    preset.maxDrops !== undefined && ui.drops >= preset.maxDrops;
  const goalProgress =
    preset.goal === undefined
      ? ''
      : formatGoalProgress(preset.goal, getRunMetrics());

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
            holdLimitReached ||
            !ui.canDrop ||
            !ui.canHold ||
            ui.gameOver ||
            ui.experimentComplete ||
            ui.experimentFailed
          }
          aria-label={
            !preset.allowHold
              ? 'Hold unavailable in this mode'
              : holdLimitReached
                ? 'Hold limit reached'
                : ui.holdTier === null
                  ? 'Hold current monster'
                  : 'Swap current monster with held monster'
          }
        >
          <span>
            {!preset.allowHold
              ? 'LOCKED'
              : holdLimitReached
                ? 'LIMIT'
                : ui.canHold
                  ? 'HOLD'
                  : 'USED'}
          </span>
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
                    : ui.experimentFailed
                      ? 'FAILED'
                      : preset.goal
                        ? preset.goal.hint + ' · ' + goalProgress
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
            {coach && !ui.gameOver && (
              <button className="coach" onClick={() => { storageSet(COACH_KEY, 'done'); setCoach(false); }}>
                Drag to aim · release to drop
              </button>
            )}
            {ui.combo > 1 && <div className="combo-badge">CHAIN ×{ui.combo}</div>}
            {ui.message && <div className="toast" role="status">{ui.message}</div>}
            {ui.experimentComplete && (
              <div className="game-over experiment-complete" role="dialog" aria-modal="true">
                <div className="game-over-card">
                  <span>EXPERIMENT COMPLETE</span>
                  <h2>{preset.goal?.successLabel ?? 'GOAL COMPLETE'}</h2>
                  <p>Goal cleared in {ui.score} points</p>
                  <div className="completion-actions">
                    <button autoFocus onClick={restart}>Retry</button>
                    <button onClick={() => setShowLab(true)}>Lab</button>
                  </div>
                </div>
              </div>
            )}
            {ui.experimentFailed && !ui.experimentComplete && (
              <div className="game-over experiment-failed" role="dialog" aria-modal="true">
                <div className="game-over-card">
                  <span>EXPERIMENT FAILED</span>
                  <h2>TRY ANOTHER APPROACH</h2>
                  <p>{ui.experimentFailureReason}</p>
                  <div className="completion-actions">
                    <button autoFocus onClick={restart}>Retry</button>
                    <button onClick={() => setShowLab(true)}>Lab</button>
                  </div>
                </div>
              </div>
            )}
            {ui.gameOver && !ui.experimentComplete && (
              <div className="game-over" role="dialog" aria-modal="true">
                <div className="game-over-card">
                  <span>{preset.mode === 'daily' ? 'DAILY OVER' : 'LAB OVERFLOW'}</span>
                  <h2>{ui.score}</h2>
                  <p>Best {ui.bestScore}</p>
                  <button autoFocus onClick={restart}>Try again</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="concept-toolbar">
          <button
            type="button"
            onClick={() => setShowShop(true)}
            className="wood-button shop-hit"
            aria-label="Shop"
          >
            SHOP
          </button>
          <button
            type="button"
            onClick={() => setShowMonsters(true)}
            className="wood-button monsters-hit"
            aria-label="Monsters"
          >
            MONSTERS
          </button>
          <button
            type="button"
            onClick={drop}
            className="concept-drop-button drop-hit"
            disabled={
              !ui.canDrop ||
              ui.gameOver ||
              ui.experimentComplete ||
              ui.experimentFailed ||
              dropLimitReached
            }
            aria-label={dropLimitReached ? 'Drop limit reached' : 'Drop monster'}
          >
            DROP
          </button>
          <button
            type="button"
            onClick={nudge}
            className="wood-button power-hit"
            disabled={
              !preset.allowPower ||
              powerLimitReached ||
              ui.gameOver ||
              ui.experimentComplete ||
              ui.experimentFailed
            }
            aria-label={
              !preset.allowPower
                ? 'Power-up unavailable in this mode'
                : powerLimitReached
                  ? 'Power-up limit reached'
                  : 'Power-up. ' + String(ui.powerCharges) + ' available'
            }
          >
            <RotateCcw size={22} />
            <span>POWER</span>
            {ui.powerCharges > 0 && (
              <b className="power-charge" aria-hidden="true">{ui.powerCharges}</b>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowLab(true)}
            className="wood-button lab-hit"
            aria-label="Lab and game modes"
          >
            LAB
          </button>
        </div>

        {showMonsters && (
          <div
            className="monster-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evolution-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowMonsters(false);
            }}
          >
            <div className="monster-modal-card">
              <button autoFocus className="modal-close" onClick={() => setShowMonsters(false)} aria-label="Close">×</button>
              <h2 id="evolution-title">MONSTER EVOLUTION</h2>
              <div className="evolution-grid">
                {TIER_DEFS.map((def, tier) => (
                  <div key={def.name} className={tier <= ui.bestTier + 1 ? '' : 'locked'}>
                    <MonsterArt tier={tier} size={66} />
                    <span>{def.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showShop && (
          <div
            className="monster-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowShop(false);
            }}
          >
            <div className="monster-modal-card shop-card">
              <button autoFocus className="modal-close" onClick={() => setShowShop(false)} aria-label="Close">×</button>
              <h2 id="shop-title">SHOP</h2>
              <div className="shop-item">
                <MonsterArt tier={4} size={72} />
                <div>
                  <strong>Pulse</strong>
                  <span>Loosens a crowded pile and creates new merge chances.</span>
                </div>
                <button
                  type="button"
                  className="buy-button"
                  onClick={buyPower}
                  disabled={ui.coins < POWER_COST}
                >
                  ● {POWER_COST}
                </button>
              </div>
              <p className="shop-stock">Owned: {ui.powerCharges}</p>
            </div>
          </div>
        )}

        {showLab && (
          <div
            className="monster-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowLab(false);
            }}
          >
            <div className="monster-modal-card lab-card">
              <button autoFocus className="modal-close" onClick={() => setShowLab(false)} aria-label="Close">×</button>
              <h2 id="lab-title">LAB</h2>
              <div className="mode-grid" role="group" aria-label="Game modes">
                {MODE_OPTIONS.map((option) => {
                  const active = option.id === preset.mode;
                  return (
                    <button
                      type="button"
                      className={'mode-card' + (active ? ' is-active' : '')}
                      key={option.id}
                      disabled={active}
                      onClick={() => startMode(option.id)}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                      <b>{active ? 'ACTIVE' : 'START'}</b>
                    </button>
                  );
                })}
              </div>
              <dl className="lab-stats">
                <div><dt>Current mode</dt><dd>{preset.title}</dd></div>
                <div><dt>Best score</dt><dd>{ui.bestScore}</dd></div>
                <div><dt>Orders completed</dt><dd>{Math.max(0, ui.orderNo - 1)}</dd></div>
                <div><dt>Highest evolution</dt><dd>{TIER_DEFS[Math.min(ui.bestTier, MAX_TIER)]!.name}</dd></div>
                <div><dt>Coins</dt><dd>{ui.coins}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

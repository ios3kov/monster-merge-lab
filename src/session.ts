import type { GameMode } from './modes.ts';
import { MAX_TIER, spawnBody, type Body } from './physics.ts';

export const ACTIVE_RUN_SESSION_VERSION = 1;
export const ACTIVE_RUN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type SavedRunBody = {
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  impact: number;
  pressure: number;
  ageMs: number;
};

export type SavedRunUi = {
  score: number;
  progress: number;
  orderNo: number;
  currentTier: number;
  nextTier: number;
  afterNextTier: number;
  holdTier: number | null;
  canHold: boolean;
  bestCombo: number;
  overdrive: number;
  overdriveActive: boolean;
  runHighestTier: number;
  runMerges: number;
  runDrops: number;
  runHoldUses: number;
  runPowerUses: number;
  runOrdersCompleted: number;
  runRescues: number;
};

export type ActiveRunSession = {
  version: typeof ACTIVE_RUN_SESSION_VERSION;
  savedAt: number;
  mode: GameMode;
  experimentId?: string;
  dailyKey?: string;
  ui: SavedRunUi;
  bodies: SavedRunBody[];
  fixedQueue: number[];
  spawnBag: number[];
  aimX: number;
  dangerElapsedMs: number | null;
  overdriveRemainingMs: number;
  randomState?: number;
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return finite(value) && Number.isInteger(value) && value >= 0;
}

function validTier(value: unknown): value is number {
  return nonNegativeInteger(value) && value <= MAX_TIER;
}

function validTierArray(value: unknown, maxLength: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every(validTier)
  );
}

function validOptionalString(value: unknown) {
  return value === undefined || (typeof value === 'string' && value.length <= 64);
}

function validUi(value: unknown): value is SavedRunUi {
  if (!value || typeof value !== 'object') return false;
  const ui = value as Partial<SavedRunUi>;
  return (
    nonNegativeInteger(ui.score) &&
    nonNegativeInteger(ui.progress) &&
    nonNegativeInteger(ui.orderNo) &&
    ui.orderNo >= 1 &&
    validTier(ui.currentTier) &&
    validTier(ui.nextTier) &&
    validTier(ui.afterNextTier) &&
    (ui.holdTier === null || validTier(ui.holdTier)) &&
    typeof ui.canHold === 'boolean' &&
    nonNegativeInteger(ui.bestCombo) &&
    finite(ui.overdrive) &&
    ui.overdrive >= 0 &&
    ui.overdrive <= 100 &&
    typeof ui.overdriveActive === 'boolean' &&
    validTier(ui.runHighestTier) &&
    nonNegativeInteger(ui.runMerges) &&
    nonNegativeInteger(ui.runDrops) &&
    nonNegativeInteger(ui.runHoldUses) &&
    nonNegativeInteger(ui.runPowerUses) &&
    nonNegativeInteger(ui.runOrdersCompleted) &&
    nonNegativeInteger(ui.runRescues)
  );
}

function validSavedBody(value: unknown): value is SavedRunBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<SavedRunBody>;
  return (
    validTier(body.tier) &&
    finite(body.x) &&
    finite(body.y) &&
    finite(body.vx) &&
    finite(body.vy) &&
    finite(body.angle) &&
    finite(body.omega) &&
    finite(body.impact) &&
    body.impact >= 0 &&
    body.impact <= 1 &&
    finite(body.pressure) &&
    body.pressure >= 0 &&
    body.pressure <= 1 &&
    finite(body.ageMs) &&
    body.ageMs >= 0 &&
    body.ageMs <= ACTIVE_RUN_SESSION_TTL_MS
  );
}

export function saveBodyForSession(body: Body, now: number): SavedRunBody {
  return {
    tier: body.tier,
    x: body.x,
    y: body.y,
    vx: body.vx,
    vy: body.vy,
    angle: body.angle,
    omega: body.omega,
    impact: body.impact,
    pressure: body.pressure,
    ageMs: Math.max(0, now - body.bornAt),
  };
}

export function restoreBodiesFromSession(
  bodies: readonly SavedRunBody[],
  now: number,
) {
  return bodies.map((saved) => {
    const body = spawnBody(saved.tier, saved.x, saved.y, now - saved.ageMs);
    body.vx = saved.vx;
    body.vy = saved.vy;
    body.angle = saved.angle;
    body.omega = saved.omega;
    body.impact = saved.impact;
    body.pressure = saved.pressure;
    return body;
  });
}

export function encodeActiveRunSession(session: ActiveRunSession) {
  return JSON.stringify(session);
}

export function decodeActiveRunSession(
  raw: string | null,
  now = Date.now(),
): ActiveRunSession | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<ActiveRunSession>;
    if (
      value.version !== ACTIVE_RUN_SESSION_VERSION ||
      !finite(value.savedAt) ||
      value.savedAt > now + 5 * 60 * 1000 ||
      now - value.savedAt > ACTIVE_RUN_SESSION_TTL_MS ||
      !['endless', 'experiments', 'daily'].includes(value.mode ?? '') ||
      !validOptionalString(value.experimentId) ||
      !validOptionalString(value.dailyKey) ||
      !validUi(value.ui) ||
      !Array.isArray(value.bodies) ||
      value.bodies.length > 96 ||
      !value.bodies.every(validSavedBody) ||
      !validTierArray(value.fixedQueue, 256) ||
      !validTierArray(value.spawnBag, 32) ||
      !finite(value.aimX) ||
      !(
        value.dangerElapsedMs === null ||
        (finite(value.dangerElapsedMs) && value.dangerElapsedMs >= 0)
      ) ||
      !finite(value.overdriveRemainingMs) ||
      value.overdriveRemainingMs < 0 ||
      !(
        value.randomState === undefined ||
        nonNegativeInteger(value.randomState)
      )
    ) {
      return null;
    }

    if (value.mode === 'experiments' && !value.experimentId) return null;
    if (value.mode === 'daily' && !value.dailyKey) return null;

    return value as ActiveRunSession;
  } catch {
    return null;
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACTIVE_RUN_SESSION_TTL_MS,
  decodeActiveRunSession,
  encodeActiveRunSession,
  restoreBodiesFromSession,
  saveBodyForSession,
  type ActiveRunSession,
} from '../src/session.ts';
import { spawnBody } from '../src/physics.ts';

function fixture(savedAt = 10_000): ActiveRunSession {
  return {
    version: 1,
    savedAt,
    mode: 'endless',
    ui: {
      score: 120,
      progress: 0,
      orderNo: 1,
      currentTier: 0,
      nextTier: 1,
      afterNextTier: 0,
      holdTier: null,
      canHold: true,
      bestCombo: 2,
      overdrive: 35,
      overdriveActive: false,
      runHighestTier: 2,
      runMerges: 4,
      runDrops: 7,
      runHoldUses: 1,
      runPowerUses: 0,
      runOrdersCompleted: 0,
      runRescues: 0,
    },
    bodies: [],
    fixedQueue: [],
    spawnBag: [0, 1],
    aimX: 180,
    dangerElapsedMs: null,
    overdriveRemainingMs: 0,
  };
}

test('active run session round-trips through JSON', () => {
  const session = fixture();
  const decoded = decodeActiveRunSession(
    encodeActiveRunSession(session),
    session.savedAt,
  );
  assert.deepEqual(decoded, session);
});

test('stale, corrupt and structurally invalid sessions are rejected', () => {
  assert.equal(decodeActiveRunSession('{bad json'), null);

  const stale = fixture(1_000);
  assert.equal(
    decodeActiveRunSession(
      encodeActiveRunSession(stale),
      stale.savedAt + ACTIVE_RUN_SESSION_TTL_MS + 1,
    ),
    null,
  );

  const invalid = fixture();
  invalid.ui.currentTier = 99;
  assert.equal(
    decodeActiveRunSession(encodeActiveRunSession(invalid), invalid.savedAt),
    null,
  );
});

test('Daily and Experiment snapshots require their run identity', () => {
  const daily = fixture();
  daily.mode = 'daily';
  assert.equal(
    decodeActiveRunSession(encodeActiveRunSession(daily), daily.savedAt),
    null,
  );

  const experiment = fixture();
  experiment.mode = 'experiments';
  assert.equal(
    decodeActiveRunSession(encodeActiveRunSession(experiment), experiment.savedAt),
    null,
  );
});

test('body restore creates fresh ids while preserving relative physics state', () => {
  const original = spawnBody(2, 123, 420, 1_000);
  original.vx = 12;
  original.vy = -5;
  original.angle = 0.4;
  original.omega = 0.2;
  original.impact = 0.3;
  original.pressure = 0.4;

  const saved = saveBodyForSession(original, 1_750);
  const [restored] = restoreBodiesFromSession([saved], 9_000);

  assert.ok(restored);
  assert.notEqual(restored.id, original.id);
  assert.equal(restored.tier, original.tier);
  assert.equal(restored.x, original.x);
  assert.equal(restored.y, original.y);
  assert.equal(restored.vx, original.vx);
  assert.equal(restored.vy, original.vy);
  assert.equal(restored.angle, original.angle);
  assert.equal(restored.omega, original.omega);
  assert.equal(restored.impact, original.impact);
  assert.equal(restored.pressure, original.pressure);
  assert.equal(9_000 - restored.bornAt, 750);
});


test('optional telemetry run metrics survive active-session round-trip', () => {
  const session = fixture();
  session.ui.runOverdriveStarts = 2;
  session.ui.runDangerStarts = 3;
  session.runElapsedMs = 12_345;
  session.firstDecisionElapsedMs = 620;

  const decoded = decodeActiveRunSession(
    encodeActiveRunSession(session),
    session.savedAt,
  );

  assert.equal(decoded?.ui.runOverdriveStarts, 2);
  assert.equal(decoded?.ui.runDangerStarts, 3);
  assert.equal(decoded?.runElapsedMs, 12_345);
  assert.equal(decoded?.firstDecisionElapsedMs, 620);
});

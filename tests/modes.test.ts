import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSeededRandom,
  getRunPreset,
  getUtcDayKey,
} from '../src/modes.ts';

test('Endless keeps the current full toolset and empty start queue', () => {
  const preset = getRunPreset('endless');
  assert.equal(preset.mode, 'endless');
  assert.deepEqual(preset.fixedQueue, []);
  assert.deepEqual(preset.startBodies, []);
  assert.equal(preset.allowHold, true);
  assert.equal(preset.allowPower, true);
  assert.equal(preset.allowOverdrive, true);
  assert.equal(preset.showOrders, true);
});

test('first Experiment is a deterministic merge tutorial', () => {
  const preset = getRunPreset('experiments');
  assert.equal(preset.mode, 'experiments');
  assert.deepEqual(preset.fixedQueue.slice(0, 2), [0, 0]);
  assert.equal(preset.allowHold, false);
  assert.equal(preset.allowPower, false);
  assert.equal(preset.allowOverdrive, false);
  assert.equal(preset.showOrders, false);
  assert.equal(preset.experimentId, 'exp-01');
  assert.deepEqual(preset.startBodies, []);
  assert.deepEqual(preset.goal, {
    kind: 'create-tier',
    tier: 1,
    label: 'Create a Peep',
    hint: 'Merge two Sprouts',
    successLabel: 'PEEP CREATED',
  });
});

test('Daily uses a stable UTC key and deterministic seed', () => {
  const date = new Date('2026-09-19T23:30:00-04:00');
  assert.equal(getUtcDayKey(date), '2026-09-20');

  const a = getRunPreset('daily', date);
  const b = getRunPreset('daily', new Date('2026-09-20T12:00:00Z'));
  assert.equal(a.dailyKey, '2026-09-20');
  assert.equal(a.seed, b.seed);
  assert.equal(a.allowPower, false);
  assert.equal(a.showOrders, false);
  assert.deepEqual(a.startBodies, []);
});

test('seeded random repeats the same sequence', () => {
  const a = createSeededRandom(12345);
  const b = createSeededRandom(12345);
  const first = Array.from({ length: 8 }, () => a());
  const second = Array.from({ length: 8 }, () => b());
  assert.deepEqual(first, second);
});

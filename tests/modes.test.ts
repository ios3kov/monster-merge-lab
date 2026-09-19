import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSeededRandom,
  getRunPreset,
  getUtcDayKey,
  makeDailyQueue,
  usesPersistentMetaProgress,
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
  assert.deepEqual(a.fixedQueue, b.fixedQueue);
  assert.equal(a.fixedQueue.length, 96);
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


test('Daily queue is explicit, fair-bag based and changes with the UTC day', () => {
  const first = makeDailyQueue('2026-09-20');
  const same = makeDailyQueue('2026-09-20');
  const next = makeDailyQueue('2026-09-21');

  assert.deepEqual(first, same);
  assert.notDeepEqual(first, next);
  assert.equal(first.length, 96);

  let run = 1;
  for (let i = 1; i < first.length; i += 1) {
    run = first[i] === first[i - 1] ? run + 1 : 1;
    assert.ok(run <= 3, 'Daily queue should not contain runs longer than 3');
  }
});

test('Daily disables consumable power so score cannot be bought', () => {
  const daily = getRunPreset('daily', new Date('2026-09-20T12:00:00Z'));
  assert.equal(daily.allowPower, false);
  assert.equal(daily.showOrders, false);
  assert.equal(daily.fixedQueue.length > 0, true);
});


test('only Endless can mutate persistent meta progression', () => {
  assert.equal(usesPersistentMetaProgress('endless'), true);
  assert.equal(usesPersistentMetaProgress('experiments'), false);
  assert.equal(usesPersistentMetaProgress('daily'), false);
});

test('consecutive UTC days always rotate the visible Daily opener', () => {
  const start = new Date('2026-09-01T00:00:00Z');
  let previous = makeDailyQueue(getUtcDayKey(start)).slice(0, 8);

  for (let offset = 1; offset <= 30; offset += 1) {
    const date = new Date(start.getTime() + offset * 86_400_000);
    const next = makeDailyQueue(getUtcDayKey(date)).slice(0, 8);
    assert.notDeepEqual(previous, next);
    previous = next;
  }
});

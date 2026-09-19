import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPERIMENTS,
  getExperiment,
  validateExperiment,
  validateExperimentCatalog,
  type Experiment,
} from '../src/experiments.ts';

test('production Experiment catalog is valid', () => {
  assert.deepEqual(validateExperimentCatalog(), []);
  assert.ok(EXPERIMENTS.length >= 1);
});

test('getExperiment returns cloned mutable run data', () => {
  const first = getExperiment('exp-01');
  const second = getExperiment('exp-01');

  first.queue.shift();
  first.startBodies.push({ tier: 0, x: 120, y: 500 });

  assert.notDeepEqual(first.queue, second.queue);
  assert.notDeepEqual(first.startBodies, second.startBodies);
});

test('prepared starting bodies can describe a stable non-empty composition', () => {
  const experiment: Experiment = {
    id: 'fixture-prefill',
    title: 'Fixture',
    subtitle: 'Prepared start',
    startBodies: [
      { tier: 0, x: 100, y: 500 },
      { tier: 1, x: 160, y: 490, angle: 0.2 },
      { tier: 0, x: 220, y: 500 },
    ],
    queue: [0, 1, 0, 1],
    goal: {
      kind: 'create-tier',
      tier: 2,
      label: 'Create a Puff',
      hint: 'Build a Puff',
      successLabel: 'PUFF CREATED',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: false,
  };

  assert.deepEqual(validateExperiment(experiment), []);
});

test('invalid starts fail fast before reaching runtime physics', () => {
  const experiment: Experiment = {
    ...getExperiment('exp-01'),
    id: 'invalid-start',
    startBodies: [
      { tier: 0, x: 20, y: 500 },
      { tier: 0, x: 20, y: 500 },
    ],
  };

  const errors = validateExperiment(experiment);
  assert.ok(errors.some((error) => error.includes('horizontal tank bounds')));
  assert.ok(errors.some((error) => error.includes('overlaps')));
});

test('unknown Experiment id fails fast', () => {
  assert.throws(() => getExperiment('missing'), /Unknown Experiment/);
});

test('same-tier prepared bodies cannot begin inside merge distance', () => {
  const experiment: Experiment = {
    ...getExperiment('exp-01'),
    id: 'unstable-start',
    startBodies: [
      { tier: 0, x: 140, y: 500 },
      { tier: 0, x: 171, y: 500 },
    ],
  };

  assert.ok(
    validateExperiment(experiment).some((error) =>
      error.includes('would auto-merge on load'),
    ),
  );
});

test('Experiment limits and order goals are validated', () => {
  const invalid: Experiment = {
    ...getExperiment('exp-01'),
    id: 'invalid-limits',
    goal: {
      kind: 'complete-orders',
      count: 2,
      label: 'Orders',
      hint: 'Complete two orders',
      successLabel: 'ORDERS DONE',
    },
    showOrders: false,
    maxDrops: 0,
    maxHoldUses: 1,
    allowHold: false,
  };

  const errors = validateExperiment(invalid);
  assert.ok(errors.some((error) => error.includes('requires showOrders')));
  assert.ok(errors.some((error) => error.includes('maxDrops')));
  assert.ok(errors.some((error) => error.includes('maxHoldUses requires allowHold')));
});

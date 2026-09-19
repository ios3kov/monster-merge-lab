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

test('unknown Experiment id falls back to the first designed level', () => {
  assert.equal(getExperiment('missing').id, EXPERIMENTS[0]!.id);
});

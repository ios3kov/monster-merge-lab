import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPERIMENTS,
  getExperiment,
  getNextExperimentId,
  validateExperiment,
  validateExperimentCatalog,
  type Experiment,
} from '../src/experiments.ts';

test('production Experiment catalog is valid', () => {
  assert.deepEqual(validateExperimentCatalog(), []);
  assert.equal(EXPERIMENTS.length, 12);
});

test('getExperiment returns cloned mutable run data', () => {
  const first = getExperiment('exp-01');
  const second = getExperiment('exp-01');

  first.queue.shift();
  first.startBodies.push({ tier: 0, x: 120, y: 500 });
  first.limits = { drops: 1 };

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


test('Experiment sequence advances through all 12 scenarios', () => {
  assert.equal(getNextExperimentId('exp-01'), 'exp-02');
  assert.equal(getNextExperimentId('exp-11'), 'exp-12');
  assert.equal(getNextExperimentId('exp-12'), null);
  assert.throws(() => getNextExperimentId('missing'), /Unknown Experiment/);
});

test('later Experiments use prepared starts and unlock tools progressively', () => {
  assert.equal(getExperiment('exp-01').startBodies.length, 0);
  assert.ok(getExperiment('exp-03').startBodies.length > 0);
  assert.equal(getExperiment('exp-04').allowHold, true);
  assert.equal(getExperiment('exp-07').allowOverdrive, true);
  assert.equal(getExperiment('exp-09').allowPower, true);
});


test('designed Experiments exercise the real goal system and limits', () => {
  assert.equal(getExperiment('exp-05').goal.kind, 'chain');
  assert.equal(getExperiment('exp-06').goal.kind, 'survive-danger');
  assert.equal(getExperiment('exp-07').goal.kind, 'reach-score');
  assert.equal(getExperiment('exp-08').goal.kind, 'create-merges');
  assert.equal(getExperiment('exp-09').goal.kind, 'pile-below-danger');
  assert.deepEqual(getExperiment('exp-10').limits, { powerUses: 1 });
  assert.deepEqual(getExperiment('exp-11').limits, {
    holdUses: 2,
    powerUses: 1,
  });
  assert.deepEqual(getExperiment('exp-12').limits, {
    drops: 14,
    holdUses: 3,
    powerUses: 1,
  });
});

test('invalid goals and limits are rejected by catalog validation', () => {
  const invalid: Experiment = {
    ...getExperiment('exp-05'),
    id: 'invalid-goal',
    goal: {
      kind: 'chain',
      chain: 0,
      label: 'Chain',
      hint: 'Chain',
      successLabel: 'DONE',
    },
    limits: { drops: -1 },
  };
  const errors = validateExperiment(invalid);
  assert.ok(errors.some((error) => error.includes('goal chain')));
  assert.ok(errors.some((error) => error.includes('limit drops')));
});


test('every power-enabled Experiment has a finite free run budget', () => {
  for (const experiment of EXPERIMENTS) {
    if (experiment.allowPower) {
      assert.ok(
        experiment.limits?.powerUses !== undefined &&
          experiment.limits.powerUses > 0,
        experiment.id + ' must define powerUses',
      );
    } else {
      assert.equal(experiment.limits?.powerUses, undefined);
    }
  }
});

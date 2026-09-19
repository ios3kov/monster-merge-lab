import assert from 'node:assert/strict';
import test from 'node:test';
import {
  goalProgressText,
  isGoalComplete,
  validateGoal,
  validateLimits,
  type RunGoalContext,
} from '../src/goals.ts';

const base: RunGoalContext = {
  score: 0,
  bestCombo: 0,
  highestTier: 0,
  merges: 0,
  drops: 0,
  ordersCompleted: 0,
  rescues: 0,
  pileBelowDanger: true,
};

test('goal evaluator supports every Experiment goal kind', () => {
  assert.equal(isGoalComplete({
    kind: 'create-tier', tier: 3, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, highestTier: 3 }), true);
  assert.equal(isGoalComplete({
    kind: 'reach-score', score: 100, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, score: 100 }), true);
  assert.equal(isGoalComplete({
    kind: 'chain', chain: 3, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, bestCombo: 3 }), true);
  assert.equal(isGoalComplete({
    kind: 'complete-orders', count: 2, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, ordersCompleted: 2 }), true);
  assert.equal(isGoalComplete({
    kind: 'survive-danger', rescues: 1, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, rescues: 1 }), true);
  assert.equal(isGoalComplete({
    kind: 'create-merges', count: 5, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, merges: 5 }), true);
  assert.equal(isGoalComplete({
    kind: 'pile-below-danger', minDrops: 4, label: 'x', hint: 'x', successLabel: 'x',
  }, { ...base, drops: 4, pileBelowDanger: true }), true);
});

test('pile-below-danger requires both the minimum play and a safe pile', () => {
  const goal = {
    kind: 'pile-below-danger' as const,
    minDrops: 4,
    label: 'Safe pile',
    hint: 'Keep it low',
    successLabel: 'SAFE',
  };
  assert.equal(isGoalComplete(goal, { ...base, drops: 3 }), false);
  assert.equal(
    isGoalComplete(goal, { ...base, drops: 4, pileBelowDanger: false }),
    false,
  );
});

test('goal progress is human-readable and clamped', () => {
  const goal = {
    kind: 'create-merges' as const,
    count: 5,
    label: 'Merge five',
    hint: 'Keep merging',
    successLabel: 'DONE',
  };
  assert.equal(goalProgressText(goal, { ...base, merges: 3 }), '3/5 merges');
  assert.equal(goalProgressText(goal, { ...base, merges: 8 }), '5/5 merges');
});

test('goal and limit validation reject invalid values', () => {
  assert.deepEqual(
    validateGoal({
      kind: 'chain',
      chain: 0,
      label: 'Chain',
      hint: 'Build it',
      successLabel: 'DONE',
    }),
    ['goal chain must be a positive integer'],
  );
  assert.deepEqual(validateLimits({ drops: -1 }), [
    'limit drops must be a non-negative integer',
  ]);
});

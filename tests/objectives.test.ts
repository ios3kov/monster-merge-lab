import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatGoalProgress,
  isGoalComplete,
  validateGoal,
  type Goal,
  type RunMetrics,
} from '../src/objectives.ts';

const baseMetrics: RunMetrics = {
  score: 0,
  highestTier: 0,
  bestCombo: 0,
  merges: 0,
  ordersCompleted: 0,
  rescues: 0,
  pileBelowDanger: false,
};

const copy = {
  label: 'Goal',
  hint: 'Do the thing',
  successLabel: 'DONE',
};

test('goal engine evaluates every supported goal kind', () => {
  const cases: Array<[Goal, RunMetrics]> = [
    [
      { ...copy, kind: 'create-tier', tier: 3 },
      { ...baseMetrics, highestTier: 3 },
    ],
    [
      { ...copy, kind: 'reach-score', score: 120 },
      { ...baseMetrics, score: 120 },
    ],
    [
      { ...copy, kind: 'chain', count: 3 },
      { ...baseMetrics, bestCombo: 3 },
    ],
    [
      { ...copy, kind: 'complete-orders', count: 2 },
      { ...baseMetrics, ordersCompleted: 2 },
    ],
    [
      { ...copy, kind: 'survive-danger', rescues: 1 },
      { ...baseMetrics, rescues: 1 },
    ],
    [
      { ...copy, kind: 'create-merges', count: 5 },
      { ...baseMetrics, merges: 5 },
    ],
    [
      { ...copy, kind: 'pile-below-danger', minMerges: 2 },
      { ...baseMetrics, merges: 2, pileBelowDanger: true },
    ],
  ];

  for (const [goal, metrics] of cases) {
    assert.equal(isGoalComplete(goal, metrics), true, goal.kind);
    assert.equal(isGoalComplete(goal, baseMetrics), false, goal.kind);
  }
});

test('pile-below-danger requires both progress and a safe pile', () => {
  const goal: Goal = {
    ...copy,
    kind: 'pile-below-danger',
    minMerges: 2,
  };

  assert.equal(
    isGoalComplete(goal, { ...baseMetrics, merges: 2, pileBelowDanger: false }),
    false,
  );
  assert.equal(
    isGoalComplete(goal, { ...baseMetrics, merges: 1, pileBelowDanger: true }),
    false,
  );
});

test('goal progress is concise and bounded', () => {
  assert.equal(
    formatGoalProgress(
      { ...copy, kind: 'reach-score', score: 100 },
      { ...baseMetrics, score: 140 },
    ),
    '100/100',
  );
  assert.equal(
    formatGoalProgress(
      { ...copy, kind: 'chain', count: 4 },
      { ...baseMetrics, bestCombo: 2 },
    ),
    '×2/×4',
  );
  assert.equal(
    formatGoalProgress(
      { ...copy, kind: 'pile-below-danger', minMerges: 2 },
      { ...baseMetrics, merges: 2, pileBelowDanger: true },
    ),
    'SAFE',
  );
});

test('goal validation rejects invalid thresholds and missing copy', () => {
  assert.ok(
    validateGoal(
      {
        kind: 'create-merges',
        count: 0,
        label: '',
        hint: '',
        successLabel: '',
      },
      8,
    ).length >= 4,
  );

  assert.ok(
    validateGoal(
      { ...copy, kind: 'create-tier', tier: 9 },
      8,
    ).some((error) => error.includes('mergeable tier')),
  );
});

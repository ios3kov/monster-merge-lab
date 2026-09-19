export type GoalCopy = {
  label: string;
  hint: string;
  successLabel: string;
};

export type Goal =
  | (GoalCopy & {
      kind: 'create-tier';
      tier: number;
    })
  | (GoalCopy & {
      kind: 'reach-score';
      score: number;
    })
  | (GoalCopy & {
      kind: 'chain';
      count: number;
    })
  | (GoalCopy & {
      kind: 'complete-orders';
      count: number;
    })
  | (GoalCopy & {
      kind: 'survive-danger';
      rescues: number;
    })
  | (GoalCopy & {
      kind: 'create-merges';
      count: number;
    })
  | (GoalCopy & {
      kind: 'pile-below-danger';
      minMerges: number;
    });

export type RunMetrics = {
  score: number;
  highestTier: number;
  bestCombo: number;
  merges: number;
  ordersCompleted: number;
  rescues: number;
  pileBelowDanger: boolean;
};

export function isGoalComplete(goal: Goal, metrics: RunMetrics) {
  switch (goal.kind) {
    case 'create-tier':
      return metrics.highestTier >= goal.tier;
    case 'reach-score':
      return metrics.score >= goal.score;
    case 'chain':
      return metrics.bestCombo >= goal.count;
    case 'complete-orders':
      return metrics.ordersCompleted >= goal.count;
    case 'survive-danger':
      return metrics.rescues >= goal.rescues;
    case 'create-merges':
      return metrics.merges >= goal.count;
    case 'pile-below-danger':
      return metrics.merges >= goal.minMerges && metrics.pileBelowDanger;
  }
}

export function formatGoalProgress(goal: Goal, metrics: RunMetrics) {
  switch (goal.kind) {
    case 'create-tier':
      return `${Math.min(metrics.highestTier, goal.tier)}/${goal.tier}`;
    case 'reach-score':
      return `${Math.min(metrics.score, goal.score)}/${goal.score}`;
    case 'chain':
      return `×${Math.min(metrics.bestCombo, goal.count)}/×${goal.count}`;
    case 'complete-orders':
      return `${Math.min(metrics.ordersCompleted, goal.count)}/${goal.count}`;
    case 'survive-danger':
      return `${Math.min(metrics.rescues, goal.rescues)}/${goal.rescues}`;
    case 'create-merges':
      return `${Math.min(metrics.merges, goal.count)}/${goal.count}`;
    case 'pile-below-danger':
      return metrics.pileBelowDanger ? 'SAFE' : 'CLEAR THE LINE';
  }
}

export function validateGoal(goal: Goal, maxTier: number) {
  const errors: string[] = [];

  if (!goal.label.trim()) errors.push('goal label is required');
  if (!goal.hint.trim()) errors.push('goal hint is required');
  if (!goal.successLabel.trim()) errors.push('goal successLabel is required');

  switch (goal.kind) {
    case 'create-tier':
      if (!Number.isInteger(goal.tier) || goal.tier < 1 || goal.tier > maxTier) {
        errors.push('goal tier must be a mergeable tier');
      }
      break;
    case 'reach-score':
      if (!Number.isFinite(goal.score) || goal.score <= 0) {
        errors.push('goal score must be positive');
      }
      break;
    case 'chain':
    case 'complete-orders':
    case 'create-merges':
      if (!Number.isInteger(goal.count) || goal.count <= 0) {
        errors.push(`goal ${goal.kind} count must be a positive integer`);
      }
      break;
    case 'survive-danger':
      if (!Number.isInteger(goal.rescues) || goal.rescues <= 0) {
        errors.push('goal rescues must be a positive integer');
      }
      break;
    case 'pile-below-danger':
      if (!Number.isInteger(goal.minMerges) || goal.minMerges <= 0) {
        errors.push('goal minMerges must be a positive integer');
      }
      break;
  }

  return errors;
}

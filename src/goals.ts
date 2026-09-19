export type GoalText = {
  label: string;
  hint: string;
  successLabel: string;
};

export type ExperimentGoal =
  | (GoalText & { kind: 'create-tier'; tier: number })
  | (GoalText & { kind: 'reach-score'; score: number })
  | (GoalText & { kind: 'chain'; chain: number })
  | (GoalText & { kind: 'complete-orders'; count: number })
  | (GoalText & { kind: 'survive-danger'; rescues: number })
  | (GoalText & { kind: 'create-merges'; count: number })
  | (GoalText & { kind: 'pile-below-danger'; minDrops: number });

export type ExperimentLimits = {
  drops?: number;
  holdUses?: number;
  powerUses?: number;
};

export type RunGoalContext = {
  score: number;
  bestCombo: number;
  highestTier: number;
  merges: number;
  drops: number;
  ordersCompleted: number;
  rescues: number;
  pileBelowDanger: boolean;
};

export function isGoalComplete(
  goal: ExperimentGoal | undefined,
  context: RunGoalContext,
) {
  if (!goal) return false;

  switch (goal.kind) {
    case 'create-tier':
      return context.highestTier >= goal.tier;
    case 'reach-score':
      return context.score >= goal.score;
    case 'chain':
      return context.bestCombo >= goal.chain;
    case 'complete-orders':
      return context.ordersCompleted >= goal.count;
    case 'survive-danger':
      return context.rescues >= goal.rescues;
    case 'create-merges':
      return context.merges >= goal.count;
    case 'pile-below-danger':
      return context.drops >= goal.minDrops && context.pileBelowDanger;
  }
}

export function goalProgressText(
  goal: ExperimentGoal | undefined,
  context: RunGoalContext,
) {
  if (!goal) return '';

  switch (goal.kind) {
    case 'create-tier':
      return `Tier ${Math.min(context.highestTier, goal.tier) + 1}/${goal.tier + 1}`;
    case 'reach-score':
      return `${Math.min(context.score, goal.score)}/${goal.score} points`;
    case 'chain':
      return `Best chain ×${Math.min(context.bestCombo, goal.chain)}/×${goal.chain}`;
    case 'complete-orders':
      return `${Math.min(context.ordersCompleted, goal.count)}/${goal.count} orders`;
    case 'survive-danger':
      return `${Math.min(context.rescues, goal.rescues)}/${goal.rescues} rescues`;
    case 'create-merges':
      return `${Math.min(context.merges, goal.count)}/${goal.count} merges`;
    case 'pile-below-danger':
      return context.drops < goal.minDrops
        ? `${context.drops}/${goal.minDrops} drops`
        : context.pileBelowDanger
          ? 'Pile is safe'
          : 'Clear the danger line';
  }
}

export function validateGoal(goal: ExperimentGoal) {
  const errors: string[] = [];
  if (!goal.label.trim()) errors.push('goal label is required');
  if (!goal.hint.trim()) errors.push('goal hint is required');
  if (!goal.successLabel.trim()) errors.push('goal successLabel is required');

  const positiveInteger = (value: number, field: string) => {
    if (!Number.isInteger(value) || value <= 0) {
      errors.push(`${field} must be a positive integer`);
    }
  };

  switch (goal.kind) {
    case 'create-tier':
      positiveInteger(goal.tier, 'goal tier');
      break;
    case 'reach-score':
      positiveInteger(goal.score, 'goal score');
      break;
    case 'chain':
      positiveInteger(goal.chain, 'goal chain');
      break;
    case 'complete-orders':
      positiveInteger(goal.count, 'goal order count');
      break;
    case 'survive-danger':
      positiveInteger(goal.rescues, 'goal rescue count');
      break;
    case 'create-merges':
      positiveInteger(goal.count, 'goal merge count');
      break;
    case 'pile-below-danger':
      positiveInteger(goal.minDrops, 'goal minDrops');
      break;
  }

  return errors;
}

export function validateLimits(limits: ExperimentLimits | undefined) {
  if (!limits) return [];
  const errors: string[] = [];

  for (const [name, value] of Object.entries(limits)) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      errors.push(`limit ${name} must be a non-negative integer`);
    }
  }

  return errors;
}

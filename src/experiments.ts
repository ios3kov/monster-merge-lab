import {
  FLOOR_Y,
  LEFT_WALL,
  MAX_TIER,
  RIGHT_WALL,
  TIER_DEFS,
} from './physics.ts';

export type StartBody = {
  tier: number;
  x: number;
  y: number;
  angle?: number;
};

export type ExperimentGoal = {
  kind: 'create-tier';
  tier: number;
  label: string;
  hint: string;
  successLabel: string;
};

export type Experiment = {
  id: string;
  title: string;
  subtitle: string;
  startBodies: StartBody[];
  queue: number[];
  goal: ExperimentGoal;
  allowHold: boolean;
  allowPower: boolean;
  allowOverdrive: boolean;
};

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: 'exp-01',
    title: 'Experiment 1',
    subtitle: 'First Reaction',
    startBodies: [],
    queue: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    goal: {
      kind: 'create-tier',
      tier: 1,
      label: 'Create a Peep',
      hint: 'Merge two Sprouts',
      successLabel: 'PEEP CREATED',
    },
    allowHold: false,
    allowPower: false,
    allowOverdrive: false,
  },
];

export function getExperiment(id = EXPERIMENTS[0]!.id): Experiment {
  const experiment = EXPERIMENTS.find((item) => item.id === id) ?? EXPERIMENTS[0]!;
  return {
    ...experiment,
    startBodies: experiment.startBodies.map((body) => ({ ...body })),
    queue: [...experiment.queue],
    goal: { ...experiment.goal },
  };
}

export function validateExperiment(experiment: Experiment) {
  const errors: string[] = [];

  if (!experiment.id.trim()) errors.push('id is required');
  if (experiment.queue.length < 3) errors.push('queue must contain at least 3 tiers');

  for (const [index, tier] of experiment.queue.entries()) {
    if (!Number.isInteger(tier) || tier < 0 || tier > MAX_TIER) {
      errors.push(`queue[${index}] has invalid tier ${String(tier)}`);
    }
  }

  for (const [index, body] of experiment.startBodies.entries()) {
    if (!Number.isInteger(body.tier) || body.tier < 0 || body.tier > MAX_TIER) {
      errors.push(`startBodies[${index}] has invalid tier ${String(body.tier)}`);
      continue;
    }

    const radius = TIER_DEFS[body.tier]!.radius;
    if (body.x - radius < LEFT_WALL || body.x + radius > RIGHT_WALL) {
      errors.push(`startBodies[${index}] is outside horizontal tank bounds`);
    }
    if (body.y - radius < 0 || body.y + radius > FLOOR_Y) {
      errors.push(`startBodies[${index}] is outside vertical tank bounds`);
    }
  }

  for (let i = 0; i < experiment.startBodies.length; i += 1) {
    const a = experiment.startBodies[i]!;
    if (a.tier < 0 || a.tier > MAX_TIER) continue;
    const radiusA = TIER_DEFS[a.tier]!.radius;

    for (let j = i + 1; j < experiment.startBodies.length; j += 1) {
      const b = experiment.startBodies[j]!;
      if (b.tier < 0 || b.tier > MAX_TIER) continue;
      const radiusB = TIER_DEFS[b.tier]!.radius;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < radiusA + radiusB - 0.5) {
        errors.push(`startBodies[${i}] overlaps startBodies[${j}]`);
      }
    }
  }

  if (
    !Number.isInteger(experiment.goal.tier) ||
    experiment.goal.tier < 1 ||
    experiment.goal.tier > MAX_TIER
  ) {
    errors.push('goal tier must be a mergeable tier');
  }

  return errors;
}

export function validateExperimentCatalog(
  experiments: readonly Experiment[] = EXPERIMENTS,
) {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const experiment of experiments) {
    if (ids.has(experiment.id)) errors.push(`duplicate experiment id: ${experiment.id}`);
    ids.add(experiment.id);
    errors.push(
      ...validateExperiment(experiment).map(
        (error) => `${experiment.id || '<missing-id>'}: ${error}`,
      ),
    );
  }

  return errors;
}

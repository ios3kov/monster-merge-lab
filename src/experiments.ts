import {
  FLOOR_Y,
  LEFT_WALL,
  MAX_TIER,
  RIGHT_WALL,
  TIER_DEFS,
} from './physics.ts';
import {
  validateGoal,
  validateLimits,
  type ExperimentGoal,
  type ExperimentLimits,
} from './goals.ts';

export type StartBody = {
  tier: number;
  x: number;
  y: number;
  angle?: number;
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
  limits?: ExperimentLimits;
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
  {
    id: 'exp-02',
    title: 'Experiment 2',
    subtitle: 'Build Up',
    startBodies: [],
    queue: [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
    goal: {
      kind: 'create-tier',
      tier: 2,
      label: 'Create a Puff',
      hint: 'Build two Peeps, then merge them',
      successLabel: 'PUFF CREATED',
    },
    allowHold: false,
    allowPower: false,
    allowOverdrive: false,
  },
  {
    id: 'exp-03',
    title: 'Experiment 3',
    subtitle: 'Read Ahead',
    startBodies: [
      { tier: 0, x: 96, y: 500 },
      { tier: 0, x: 264, y: 500 },
    ],
    queue: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
    goal: {
      kind: 'create-tier',
      tier: 2,
      label: 'Create a Puff',
      hint: 'Use NEXT to plan where the next pair will land',
      successLabel: 'PUFF CREATED',
    },
    allowHold: false,
    allowPower: false,
    allowOverdrive: false,
  },
  {
    id: 'exp-04',
    title: 'Experiment 4',
    subtitle: 'Use Hold',
    startBodies: [
      { tier: 1, x: 180, y: 500 },
      { tier: 0, x: 86, y: 500 },
    ],
    queue: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
    goal: {
      kind: 'create-tier',
      tier: 2,
      label: 'Create a Puff',
      hint: 'Hold the wrong piece and save the useful one',
      successLabel: 'PUFF CREATED',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: false,
  },
  {
    id: 'exp-05',
    title: 'Experiment 5',
    subtitle: 'Chain Reaction',
    startBodies: [
      { tier: 0, x: 95, y: 500 },
      { tier: 0, x: 145, y: 500 },
      { tier: 1, x: 235, y: 495 },
    ],
    queue: [0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
    goal: {
      kind: 'chain',
      chain: 2,
      label: 'Make a ×2 chain',
      hint: 'Trigger the next merge before the chain expires',
      successLabel: 'CHAIN COMPLETE',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: false,
  },
  {
    id: 'exp-06',
    title: 'Experiment 6',
    subtitle: 'Pressure Test',
    startBodies: [
      { tier: 2, x: 75, y: 495 },
      { tier: 1, x: 135, y: 500 },
      { tier: 2, x: 205, y: 495 },
      { tier: 1, x: 270, y: 500 },
      { tier: 0, x: 105, y: 445 },
      { tier: 0, x: 245, y: 445 },
    ],
    queue: [1, 0, 1, 0, 2, 0, 1, 0, 1, 2],
    goal: {
      kind: 'survive-danger',
      rescues: 1,
      label: 'Escape danger once',
      hint: 'Let the pile reach danger, then clear the line before time runs out',
      successLabel: 'RESCUE COMPLETE',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: false,
  },
  {
    id: 'exp-07',
    title: 'Experiment 7',
    subtitle: 'Overdrive',
    startBodies: [
      { tier: 0, x: 85, y: 500 },
      { tier: 0, x: 135, y: 500 },
      { tier: 1, x: 225, y: 495 },
      { tier: 1, x: 285, y: 495 },
    ],
    queue: [0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1],
    goal: {
      kind: 'reach-score',
      score: 420,
      label: 'Reach 420 points',
      hint: 'Keep the merge rhythm high enough to exploit Overdrive',
      successLabel: 'TARGET REACHED',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: true,
  },
  {
    id: 'exp-08',
    title: 'Experiment 8',
    subtitle: 'Split Decision',
    startBodies: [
      { tier: 2, x: 90, y: 492 },
      { tier: 1, x: 165, y: 500 },
      { tier: 2, x: 260, y: 492 },
    ],
    queue: [1, 0, 2, 0, 1, 0, 2, 1, 0, 1, 0, 2],
    goal: {
      kind: 'create-merges',
      count: 5,
      label: 'Create 5 merges',
      hint: 'Choose which side to develop first',
      successLabel: 'MERGES COMPLETE',
    },
    allowHold: true,
    allowPower: false,
    allowOverdrive: true,
  },
  {
    id: 'exp-09',
    title: 'Experiment 9',
    subtitle: 'Tight Stack',
    startBodies: [
      { tier: 2, x: 75, y: 495 },
      { tier: 2, x: 145, y: 495 },
      { tier: 1, x: 220, y: 500 },
      { tier: 1, x: 280, y: 500 },
      { tier: 0, x: 110, y: 440 },
      { tier: 0, x: 250, y: 440 },
    ],
    queue: [1, 2, 0, 1, 0, 2, 0, 1, 1, 0, 2, 0],
    goal: {
      kind: 'pile-below-danger',
      minDrops: 6,
      label: 'Keep the pile safe',
      hint: 'Make 6 drops, then finish with everything below the danger line',
      successLabel: 'PILE STABILIZED',
    },
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
  },
  {
    id: 'exp-10',
    title: 'Experiment 10',
    subtitle: 'Recovery',
    startBodies: [
      { tier: 3, x: 90, y: 490 },
      { tier: 2, x: 175, y: 495 },
      { tier: 3, x: 270, y: 490 },
      { tier: 0, x: 130, y: 420 },
      { tier: 1, x: 225, y: 420 },
    ],
    queue: [2, 0, 1, 2, 1, 0, 2, 0, 1, 2, 1, 0],
    goal: {
      kind: 'create-tier',
      tier: 4,
      label: 'Create a Munch',
      hint: 'Use HOLD or Pulse if the center locks up',
      successLabel: 'MUNCH CREATED',
    },
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
    limits: { powerUses: 1 },
  },
  {
    id: 'exp-11',
    title: 'Experiment 11',
    subtitle: 'Two Fronts',
    startBodies: [
      { tier: 3, x: 85, y: 490 },
      { tier: 2, x: 165, y: 495 },
      { tier: 2, x: 245, y: 495 },
      { tier: 1, x: 295, y: 440 },
    ],
    queue: [2, 1, 2, 0, 1, 2, 0, 2, 1, 0, 2, 1],
    goal: {
      kind: 'create-merges',
      count: 6,
      label: 'Create 6 merges',
      hint: 'Balance both sides and use HOLD deliberately',
      successLabel: 'MERGES COMPLETE',
    },
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
    limits: { holdUses: 2 },
  },
  {
    id: 'exp-12',
    title: 'Experiment 12',
    subtitle: 'Final Mix',
    startBodies: [
      { tier: 3, x: 80, y: 490 },
      { tier: 2, x: 165, y: 495 },
      { tier: 3, x: 275, y: 490 },
      { tier: 1, x: 115, y: 410 },
      { tier: 1, x: 240, y: 410 },
    ],
    queue: [2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2],
    goal: {
      kind: 'create-tier',
      tier: 5,
      label: 'Create a Beast',
      hint: 'Combine NEXT, HOLD, Pulse and Overdrive deliberately',
      successLabel: 'BEAST CREATED',
    },
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
    limits: { drops: 14, holdUses: 3, powerUses: 1 },
  },
];

export function getExperiment(id = EXPERIMENTS[0]!.id): Experiment {
  const experiment = EXPERIMENTS.find((item) => item.id === id);
  if (!experiment) throw new Error(`Unknown Experiment: ${id}`);

  return {
    ...experiment,
    startBodies: experiment.startBodies.map((body) => ({ ...body })),
    queue: [...experiment.queue],
    goal: { ...experiment.goal },
    ...(experiment.limits ? { limits: { ...experiment.limits } } : {}),
  };
}

export function getNextExperimentId(id: string) {
  const index = EXPERIMENTS.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Unknown Experiment: ${id}`);
  return EXPERIMENTS[index + 1]?.id ?? null;
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
      } else if (
        a.tier === b.tier &&
        distance <= radiusA + radiusB + 1.6
      ) {
        errors.push(
          `startBodies[${i}] and startBodies[${j}] would auto-merge on load`,
        );
      }
    }
  }

  errors.push(...validateGoal(experiment.goal));
  errors.push(...validateLimits(experiment.limits));
  if (experiment.goal.kind === 'create-tier' && experiment.goal.tier > MAX_TIER) {
    errors.push('goal tier must exist in the tier catalog');
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

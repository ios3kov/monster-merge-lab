import { getExperiment, type StartBody } from './experiments.ts';
import type { ExperimentGoal, ExperimentLimits } from './goals.ts';
import { drawSpawnTier } from './gameplay.ts';
export type GameMode = 'endless' | 'experiments' | 'daily';

export type RunPreset = {
  mode: GameMode;
  title: string;
  subtitle: string;
  fixedQueue: number[];
  startBodies: StartBody[];
  seed?: number;
  allowHold: boolean;
  allowPower: boolean;
  allowOverdrive: boolean;
  showOrders: boolean;
  goal?: ExperimentGoal;
  limits?: ExperimentLimits;
  dailyKey?: string;
  experimentId?: string;
};

export const MODE_OPTIONS: ReadonlyArray<{
  id: GameMode;
  title: string;
  description: string;
}> = [
  {
    id: 'endless',
    title: 'Endless Lab',
    description: 'Build from zero and chase a high score.',
  },
  {
    id: 'experiments',
    title: 'Experiments',
    description: 'Short designed challenges with clear goals.',
  },
  {
    id: 'daily',
    title: 'Daily Experiment',
    description: 'Same daily setup and queue for everyone.',
  },
];

export function getUtcDayKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hashSeed(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

export function makeDailyQueue(dailyKey: string, length = 96) {
  const random = createSeededRandom(
    hashSeed('monster-merge-lab:daily-queue:' + dailyKey),
  );
  const bag: number[] = [];
  const queue: number[] = [];
  for (let i = 0; i < length; i += 1) {
    queue.push(drawSpawnTier(bag, 0, random));
  }
  return queue;
}

export function getRunPreset(
  mode: GameMode,
  date = new Date(),
  experimentId?: string,
): RunPreset {
  if (mode === 'experiments') {
    const experiment = getExperiment(experimentId);
    return {
      mode,
      title: experiment.title,
      subtitle: experiment.subtitle,
      fixedQueue: [...experiment.queue],
      startBodies: experiment.startBodies.map((body) => ({ ...body })),
      allowHold: experiment.allowHold,
      allowPower: experiment.allowPower,
      allowOverdrive: experiment.allowOverdrive,
      showOrders: experiment.goal.kind === 'complete-orders',
      goal: { ...experiment.goal },
      ...(experiment.limits ? { limits: { ...experiment.limits } } : {}),
      experimentId: experiment.id,
    };
  }

  if (mode === 'daily') {
    const dailyKey = getUtcDayKey(date);
    return {
      mode,
      title: 'Daily Experiment',
      subtitle: dailyKey,
      fixedQueue: makeDailyQueue(dailyKey),
      startBodies: [],
      seed: hashSeed('monster-merge-lab:daily-tail:' + dailyKey),
      allowHold: true,
      allowPower: false,
      allowOverdrive: true,
      showOrders: false,
      dailyKey,
    };
  }

  return {
    mode: 'endless',
    title: 'Endless Lab',
    subtitle: 'High score',
    fixedQueue: [],
    startBodies: [],
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
    showOrders: true,
  };
}

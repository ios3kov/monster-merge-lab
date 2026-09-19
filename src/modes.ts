export type GameMode = 'endless' | 'experiments' | 'daily';

export type Goal =
  | {
      kind: 'create-tier';
      tier: number;
      label: string;
    };

export type RunPreset = {
  mode: GameMode;
  title: string;
  subtitle: string;
  fixedQueue: number[];
  seed?: number;
  allowHold: boolean;
  allowPower: boolean;
  allowOverdrive: boolean;
  showOrders: boolean;
  goal?: Goal;
  dailyKey?: string;
};

const FIRST_EXPERIMENT_QUEUE = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

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

export function getRunPreset(
  mode: GameMode,
  date = new Date(),
): RunPreset {
  if (mode === 'experiments') {
    return {
      mode,
      title: 'Experiment 1',
      subtitle: 'Create a Peep',
      fixedQueue: [...FIRST_EXPERIMENT_QUEUE],
      allowHold: false,
      allowPower: false,
      allowOverdrive: false,
      showOrders: false,
      goal: {
        kind: 'create-tier',
        tier: 1,
        label: 'Create a Peep',
      },
    };
  }

  if (mode === 'daily') {
    const dailyKey = getUtcDayKey(date);
    return {
      mode,
      title: 'Daily Experiment',
      subtitle: dailyKey,
      fixedQueue: [],
      seed: hashSeed('monster-merge-lab:' + dailyKey),
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
    allowHold: true,
    allowPower: true,
    allowOverdrive: true,
    showOrders: true,
  };
}

export type Order = {
  tier: number;
  count: number;
  reward: number;
};

type RandomSource = () => number;

export function makeOrder(orderNo: number): Order {
  const seq = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7];
  const tier =
    seq[Math.min(seq.length - 1, Math.max(0, orderNo - 1))] ?? 1;
  const count = orderNo <= 3 ? 1 : orderNo <= 8 ? 2 : 3;
  return { tier, count, reward: (tier + 1) * count * 60 };
}

export function shuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function hasLongRun(items: readonly number[], maxRun = 3) {
  let run = 1;
  for (let i = 1; i < items.length; i += 1) {
    run = items[i] === items[i - 1] ? run + 1 : 1;
    if (run > maxRun) return true;
  }
  return false;
}

export function makeSpawnBag(
  bestTier: number,
  random: RandomSource = Math.random,
) {
  const base =
    bestTier >= 6
      ? [0, 0, 0, 0, 0, 1, 1, 2]
      : bestTier >= 3
        ? [0, 0, 0, 0, 0, 0, 1, 1]
        : [0, 0, 0, 0, 0, 0, 1, 1];

  let candidate = shuffle(base, random);
  for (
    let attempt = 0;
    attempt < 12 && hasLongRun(candidate);
    attempt += 1
  ) {
    candidate = shuffle(base, random);
  }
  return candidate;
}

export function drawSpawnTier(
  bag: number[],
  bestTier: number,
  random: RandomSource = Math.random,
) {
  if (bag.length === 0) bag.push(...makeSpawnBag(bestTier, random));
  return bag.shift() ?? 0;
}


export const OVERDRIVE_MAX = 100;
export const OVERDRIVE_DURATION_MS = 7200;
export const DANGER_GRACE_MS = 2400;
export const DROP_COOLDOWN_MS = 380;

export function getOverdriveGain(tier: number, combo: number) {
  const tierBonus = Math.min(10, Math.max(0, tier) * 2);
  const chainBonus = Math.min(3, Math.max(0, combo - 1)) * 3;
  return 11 + tierBonus + chainBonus;
}

export function getOverdriveExtensionMs(combo: number) {
  if (combo <= 1) return 0;
  return 140 + Math.min(220, (combo - 1) * 60);
}

export function shiftGameplayClocksForPause(
  pausedForMs: number,
  dangerStartedAt: number | null,
  overdriveEndsAt: number,
  overdriveActive: boolean,
) {
  const shift =
    Number.isFinite(pausedForMs) && pausedForMs > 0 ? pausedForMs : 0;
  return {
    dangerStartedAt:
      dangerStartedAt === null ? null : dangerStartedAt + shift,
    overdriveEndsAt:
      overdriveActive && overdriveEndsAt > 0
        ? overdriveEndsAt + shift
        : overdriveEndsAt,
  };
}

export function getMergeShockwave(tier: number, radius: number) {
  const normalizedTier = Math.max(0, tier);
  return {
    radius: radius * 2.15 + 18,
    impulse: 24 + Math.min(36, normalizedTier * 5),
    upwardLift: 7,
    spin: 0.1,
    impactBase: 0.14,
    impactGain: 0.18,
    mergedLift: Math.min(30, 8 + normalizedTier * 3),
  };
}

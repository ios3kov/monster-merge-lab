import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DANGER_GRACE_MS,
  DROP_COOLDOWN_MS,
  OVERDRIVE_DURATION_MS,
  OVERDRIVE_MAX,
  drawSpawnTier,
  getMergeShockwave,
  getOverdriveExtensionMs,
  getOverdriveGain,
  hasLongRun,
  makeOrder,
  makeSpawnBag,
  shiftGameplayClocksForPause,
} from '../src/gameplay.ts';

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

test('starter bag includes planning variety without high tiers', () => {
  const bag = makeSpawnBag(0, seeded(7));
  assert.equal(bag.length, 8);
  assert.equal(bag.filter((tier) => tier === 0).length, 6);
  assert.equal(bag.filter((tier) => tier === 1).length, 2);
  assert.equal(bag.some((tier) => tier > 1), false);
  assert.equal(hasLongRun(bag, 4), false);
});

test('advanced bag gradually introduces tier two', () => {
  const bag = makeSpawnBag(6, seeded(13));
  assert.equal(bag.filter((tier) => tier === 0).length, 5);
  assert.equal(bag.filter((tier) => tier === 1).length, 2);
  assert.equal(bag.filter((tier) => tier === 2).length, 1);
});

test('drawSpawnTier refills an empty bag', () => {
  const bag: number[] = [];
  const tier = drawSpawnTier(bag, 3, seeded(3));
  assert.ok(tier === 0 || tier === 1);
  assert.equal(bag.length, 7);
});

test('orders scale reward and required count', () => {
  assert.deepEqual(makeOrder(1), { tier: 1, count: 1, reward: 120 });
  assert.equal(makeOrder(5).count, 2);
  assert.equal(makeOrder(10).count, 3);
  assert.ok(makeOrder(10).reward > makeOrder(1).reward);
});


test('Overdrive reaches a payoff after a meaningful midgame merge streak', () => {
  const sequence = [
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 1],
    [2, 2],
    [3, 3],
  ] as const;

  let meter = 0;
  for (let i = 0; i < sequence.length; i += 1) {
    const [tier, combo] = sequence[i]!;
    meter += getOverdriveGain(tier, combo);
    if (i < sequence.length - 1) {
      assert.ok(meter < OVERDRIVE_MAX);
    }
  }
  assert.ok(meter >= OVERDRIVE_MAX);
});

test('Overdrive and rescue timings keep the peak short and the rescue tense', () => {
  assert.ok(OVERDRIVE_DURATION_MS >= 6500);
  assert.ok(OVERDRIVE_DURATION_MS <= 8500);
  assert.ok(DANGER_GRACE_MS >= 1800);
  assert.ok(DANGER_GRACE_MS <= 2500);
});


test('Overdrive cadence lands after about eight ordinary tier-one merges', () => {
  const ordinaryGain = getOverdriveGain(1, 1);
  assert.ok(ordinaryGain * 7 < OVERDRIVE_MAX);
  assert.ok(ordinaryGain * 8 >= OVERDRIVE_MAX);
});

test('chains extend Overdrive without making every merge prolong it', () => {
  assert.equal(getOverdriveExtensionMs(1), 0);
  assert.ok(getOverdriveExtensionMs(2) > 0);
  assert.ok(getOverdriveExtensionMs(5) <= 360);
});

test('drop rhythm stays responsive without allowing accidental double drops', () => {
  assert.ok(DROP_COOLDOWN_MS >= 320);
  assert.ok(DROP_COOLDOWN_MS <= 420);
});

test('shockwave scales with monster size but stays bounded', () => {
  const low = getMergeShockwave(1, 20);
  const high = getMergeShockwave(6, 60);

  assert.ok(low.radius < high.radius);
  assert.ok(low.impulse < high.impulse);
  assert.ok(high.impulse <= 60);
  assert.ok(high.mergedLift <= 30);
});

test('rescue window is readable but still tense', () => {
  assert.ok(DANGER_GRACE_MS >= 2300);
  assert.ok(DANGER_GRACE_MS <= 2500);
});


test('background pause shifts active gameplay clocks without consuming them', () => {
  assert.deepEqual(
    shiftGameplayClocksForPause(5000, 1000, 8000, true),
    {
      dangerStartedAt: 6000,
      overdriveEndsAt: 13000,
    },
  );
});

test('background pause leaves inactive clocks untouched and clamps bad durations', () => {
  assert.deepEqual(
    shiftGameplayClocksForPause(-50, null, 0, false),
    {
      dangerStartedAt: null,
      overdriveEndsAt: 0,
    },
  );
  assert.deepEqual(
    shiftGameplayClocksForPause(Number.NaN, 1200, 0, false),
    {
      dangerStartedAt: 1200,
      overdriveEndsAt: 0,
    },
  );
});

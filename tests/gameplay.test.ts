import assert from 'node:assert/strict';
import test from 'node:test';
import {
  drawSpawnTier,
  hasLongRun,
  makeOrder,
  makeSpawnBag,
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

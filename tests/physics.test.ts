import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnBody, stepWorld } from '../src/physics.ts';

test('matching touching bodies merge into the next tier', () => {
  const world = {
    bodies: [
      spawnBody(0, 120, 300, 0),
      spawnBody(0, 149, 300, 0),
    ],
  };
  const merges: number[] = [];

  stepWorld(
    world,
    1 / 120,
    250,
    ({ tier }) => merges.push(tier),
    () => {},
  );

  assert.deepEqual(merges, [1]);
  assert.equal(world.bodies.length, 1);
  assert.equal(world.bodies[0]!.tier, 1);
});

test('a merge shockwave affects a nearby non-matching body', () => {
  const a = spawnBody(0, 120, 300, 0);
  const b = spawnBody(0, 149, 300, 0);
  const neighbor = spawnBody(2, 190, 300, 0);
  const world = { bodies: [a, b, neighbor] };
  const before = neighbor.vx;

  stepWorld(world, 1 / 120, 250, () => {}, () => {});

  assert.equal(world.bodies.some((body) => body.tier === 1), true);
  assert.notEqual(neighbor.vx, before);
  assert.equal(Number.isFinite(neighbor.vx), true);
  assert.equal(Number.isFinite(neighbor.vy), true);
});

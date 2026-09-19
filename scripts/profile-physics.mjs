import { performance } from 'node:perf_hooks';
import { spawnBody, stepWorld, WIDTH } from '../src/physics.ts';

const bodies = [];
const startX = 52;
const startY = 188;

for (let i = 0; i < 48; i += 1) {
  const tier = i % 3;
  const x = startX + (i % 8) * 36;
  const y = startY + Math.floor(i / 8) * 46;
  const body = spawnBody(tier, Math.min(WIDTH - 52, x), y, 0);
  body.vx = ((i % 5) - 2) * 22;
  body.vy = (i % 7) * 9;
  bodies.push(body);
}

const world = { bodies };
let now = 0;
const steps = 480;

const started = performance.now();
for (let i = 0; i < steps; i += 1) {
  now += 1000 / 120;
  stepWorld(world, 1 / 120, now, () => {}, () => {});
}
const elapsed = performance.now() - started;
const msPerStep = elapsed / steps;

for (const body of world.bodies) {
  if (
    !Number.isFinite(body.x) ||
    !Number.isFinite(body.y) ||
    !Number.isFinite(body.vx) ||
    !Number.isFinite(body.vy)
  ) {
    throw new Error('Physics produced a non-finite body state');
  }
}

console.log(
  [
    'Physics profile',
    'input=48 bodies',
    'remaining=' + world.bodies.length,
    'steps=' + steps,
    'elapsed=' + elapsed.toFixed(1) + 'ms',
    'per-step=' + msPerStep.toFixed(3) + 'ms',
  ].join(' | '),
);

if (msPerStep > 3) {
  throw new Error(
    'Physics performance budget exceeded: ' +
      msPerStep.toFixed(3) +
      'ms/step > 3ms/step',
  );
}

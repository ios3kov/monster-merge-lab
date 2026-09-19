import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixedStepGameLoop } from '../src/game-loop.ts';

function fakeFrames() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  return {
    requestFrame(callback: FrameRequestCallback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id: number) {
      callbacks.delete(id);
      cancelled.push(id);
    },
    runNext(time: number) {
      const entry = callbacks.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      assert.ok(entry, 'expected a queued animation frame');
      callbacks.delete(entry[0]);
      entry[1](time);
    },
    queued() {
      return callbacks.size;
    },
    cancelled,
  };
}

test('fixed-step loop advances physics before rendering each active frame', () => {
  const frames = fakeFrames();
  const events: string[] = [];
  const loop = createFixedStepGameLoop({
    isPaused: () => false,
    onStep: (_time, step) => events.push('step:' + step.toFixed(6)),
    onFrame: () => events.push('frame'),
    now: () => 1000,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  loop.start();
  assert.equal(frames.queued(), 1);
  frames.runNext(1010);

  assert.deepEqual(events, ['step:0.008333', 'frame']);
  assert.equal(frames.queued(), 1);
  loop.stop();
  assert.equal(frames.queued(), 0);
  assert.equal(frames.cancelled.length, 1);
});

test('fixed-step loop clamps long foreground gaps to the production delta budget', () => {
  const frames = fakeFrames();
  let steps = 0;
  const loop = createFixedStepGameLoop({
    isPaused: () => false,
    onStep: () => {
      steps += 1;
    },
    onFrame: () => {},
    now: () => 1000,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  loop.start();
  frames.runNext(1200);

  assert.equal(steps, 6);
  loop.stop();
});

test('paused frames do not step or render and resetClock clears carried time', () => {
  const frames = fakeFrames();
  let paused = false;
  let steps = 0;
  let renders = 0;
  const loop = createFixedStepGameLoop({
    isPaused: () => paused,
    onStep: () => {
      steps += 1;
    },
    onFrame: () => {
      renders += 1;
    },
    now: () => 1000,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  loop.start();
  frames.runNext(1005);
  assert.equal(steps, 0);
  assert.equal(renders, 1);

  paused = true;
  loop.resetClock(2000);
  frames.runNext(2500);
  assert.equal(steps, 0);
  assert.equal(renders, 1);

  paused = false;
  loop.resetClock(2500);
  frames.runNext(2510);
  assert.equal(steps, 1);
  assert.equal(renders, 2);

  loop.stop();
});

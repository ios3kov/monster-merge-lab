export type FixedStepGameLoopHandlers = {
  onStep: (timeMs: number, stepSeconds: number) => void;
  onFrame: (timeMs: number) => void;
};

export type FixedStepGameLoopOptions = FixedStepGameLoopHandlers & {
  isPaused: () => boolean;
  fixedStepSeconds?: number;
  maxDeltaSeconds?: number;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (frameId: number) => void;
};

export type FixedStepGameLoopController = {
  start: () => void;
  stop: () => void;
  resetClock: (timeMs?: number) => void;
};

export function createFixedStepGameLoop({
  isPaused,
  onStep,
  onFrame,
  fixedStepSeconds = 1 / 120,
  maxDeltaSeconds = 0.05,
  now = () => performance.now(),
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (frameId) => cancelAnimationFrame(frameId),
}: FixedStepGameLoopOptions): FixedStepGameLoopController {
  let previous = now();
  let accumulator = 0;
  let frameId: number | null = null;
  let running = false;

  const loop = (time: number) => {
    if (!running) return;

    if (isPaused()) {
      previous = time;
      frameId = requestFrame(loop);
      return;
    }

    const delta = Math.min(maxDeltaSeconds, (time - previous) / 1000);
    previous = time;
    accumulator += delta;

    while (accumulator >= fixedStepSeconds) {
      onStep(time, fixedStepSeconds);
      accumulator -= fixedStepSeconds;
    }

    onFrame(time);
    frameId = requestFrame(loop);
  };

  return {
    start() {
      if (running) return;
      running = true;
      frameId = requestFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
    },
    resetClock(timeMs = now()) {
      previous = timeMs;
      accumulator = 0;
    },
  };
}

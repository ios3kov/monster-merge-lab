import assert from 'node:assert/strict';
import test from 'node:test';

import { prefersReducedMotion } from '../src/motion.ts';

test('prefersReducedMotion reads the current media-query state each time', () => {
  const originalWindow = globalThis.window;
  let matches = false;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: () => ({ matches }),
    },
  });

  try {
    assert.equal(prefersReducedMotion(), false);
    matches = true;
    assert.equal(prefersReducedMotion(), true);
    matches = false;
    assert.equal(prefersReducedMotion(), false);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }
});

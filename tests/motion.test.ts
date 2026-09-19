import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReducedMotionPreference,
  type ReducedMotionChange,
} from '../src/motion.ts';

test('reduced-motion preference follows media query changes at runtime', () => {
  let listener: ((event: ReducedMotionChange) => void) | null = null;
  const query = {
    matches: false,
    addEventListener(
      _type: 'change',
      next: (event: ReducedMotionChange) => void,
    ) {
      listener = next;
    },
    removeEventListener(
      _type: 'change',
      next: (event: ReducedMotionChange) => void,
    ) {
      if (listener === next) listener = null;
    },
  };

  const preference = createReducedMotionPreference(query);
  assert.equal(preference.isReduced(), false);

  listener?.({ matches: true });
  assert.equal(preference.isReduced(), true);

  listener?.({ matches: false });
  assert.equal(preference.isReduced(), false);

  preference.dispose();
  assert.equal(listener, null);
});

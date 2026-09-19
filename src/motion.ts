export type ReducedMotionChange = {
  matches: boolean;
};

export type ReducedMotionQuery = {
  matches: boolean;
  addEventListener: (
    type: 'change',
    listener: (event: ReducedMotionChange) => void,
  ) => void;
  removeEventListener: (
    type: 'change',
    listener: (event: ReducedMotionChange) => void,
  ) => void;
};

export function createReducedMotionPreference(
  query: ReducedMotionQuery | null,
) {
  let reduced = query?.matches ?? false;
  const onChange = (event: ReducedMotionChange) => {
    reduced = event.matches;
  };

  query?.addEventListener('change', onChange);

  return {
    isReduced: () => reduced,
    dispose: () => query?.removeEventListener('change', onChange),
  };
}

const runtimeQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? (window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ) as unknown as ReducedMotionQuery)
    : null;
const runtimePreference = createReducedMotionPreference(runtimeQuery);

export function prefersReducedMotion() {
  return runtimePreference.isReduced();
}

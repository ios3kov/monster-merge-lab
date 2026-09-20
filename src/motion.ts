let reducedMotionQuery: MediaQueryList | null = null;

export function prefersReducedMotion() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reducedMotionQuery.matches;
}

# Final P2 Cleanup — Global Audit Closure

Date: 2026-09-20

## Goal

Close the two safe technical P2 findings remaining after global audit passes 1
and 2, without introducing visual redesign or gameplay changes.

## Changes

### Dynamic reduced motion

- added `src/motion.ts`;
- canvas rendering reads the current `prefers-reduced-motion` state;
- the underlying `MediaQueryList` is reused;
- changing the OS/browser preference updates canvas behavior without reload;
- added focused unit coverage.

### Service-worker cache lifecycle

- shell cache: `monster-merge-lab-shell-v2`;
- runtime cache: `monster-merge-lab-runtime-v2`;
- activation deletes obsolete cache generations;
- successful online navigation parses the current HTML asset references;
- stale hashed runtime entries are pruned;
- cache-maintenance failure is non-fatal;
- Offline/PWA regression covers stale runtime entry removal.

## Explicitly deferred

- PWA install icons — requires intentional production artwork;
- art recompression — requires visual QA;
- isolated WebKit max-frame spike — p95 is healthy, monitor only;
- dependency major upgrades — separate compatibility work.

## Risk controls

- no gameplay-rule changes;
- no physics constant changes;
- no economy changes;
- no persistence/session schema changes;
- no telemetry schema changes;
- offline fallback behavior retained.

## Required verification

- TypeScript
- ESLint
- unit tests
- Chromium
- WebKit
- Offline/PWA
- Performance
- dependency audit
- Aggregate Gate
- main Deploy
- production interaction smoke

Status: IN PROGRESS.

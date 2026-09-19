import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emitTelemetry,
  resetTelemetrySequence,
  setTelemetrySink,
  type TelemetryEvent,
} from '../src/telemetry.ts';

test('telemetry emits canonical typed events to an injected sink in order', () => {
  resetTelemetrySequence();
  const seen: TelemetryEvent[] = [];
  const previous = setTelemetrySink((event) => seen.push(event));

  try {
    const first = emitTelemetry({
      name: 'run_started',
      mode: 'endless',
      resumed: false,
    });
    const second = emitTelemetry({
      name: 'first_drop',
      mode: 'experiments',
      experimentId: 'exp-03',
      tier: 1,
      drops: 1,
      runElapsedMs: 420,
    });
    const terminal = emitTelemetry({
      name: 'experiment_failed',
      mode: 'experiments',
      experimentId: 'exp-03',
      score: 100,
      reason: 'drop_limit',
      metrics: {
        runDurationMs: 5000,
        timeToFirstDecisionMs: 420,
        drops: 14,
        merges: 4,
        holdUses: 2,
        powerUses: 1,
        overdriveStarts: 1,
        dangerStarts: 2,
        rescues: 1,
      },
    });

    assert.equal(first.sequence, 1);
    assert.equal(second.sequence, 2);
    assert.equal(terminal.sequence, 3);
    assert.equal(second.experimentId, 'exp-03');
    assert.equal(terminal.metrics.timeToFirstDecisionMs, 420);
    assert.deepEqual(seen.map((event) => event.name), [
      'run_started',
      'first_drop',
      'experiment_failed',
    ]);
    assert.ok(first.at > 0);
  } finally {
    setTelemetrySink(previous);
  }
});

test('telemetry works without an external sink', () => {
  const previous = setTelemetrySink(null);
  try {
    assert.doesNotThrow(() =>
      emitTelemetry({
        name: 'game_over',
        mode: 'daily',
        dailyKey: '2026-09-19',
        score: 100,
        highestTier: 3,
        metrics: {
          runDurationMs: 9000,
          timeToFirstDecisionMs: null,
          drops: 0,
          merges: 0,
          holdUses: 0,
          powerUses: 0,
          overdriveStarts: 0,
          dangerStarts: 1,
          rescues: 0,
        },
      }),
    );
  } finally {
    setTelemetrySink(previous);
  }
});

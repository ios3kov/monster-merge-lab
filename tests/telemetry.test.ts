import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emitTelemetry,
  resetTelemetrySequence,
  setTelemetrySink,
  type TelemetryEvent,
} from '../src/telemetry.ts';

test('telemetry emits typed events to an injected sink in order', () => {
  resetTelemetrySequence();
  const seen: TelemetryEvent[] = [];
  const previous = setTelemetrySink((event) => seen.push(event));

  try {
    const first = emitTelemetry({
      name: 'session_start',
      mode: 'endless',
    });
    const second = emitTelemetry({
      name: 'drop',
      mode: 'experiments',
      experimentId: 'exp-03',
      tier: 1,
      drops: 2,
    });

    assert.equal(first.sequence, 1);
    assert.equal(second.sequence, 2);
    assert.equal(second.experimentId, 'exp-03');
    assert.equal(seen.length, 2);
    assert.deepEqual(seen.map((event) => event.name), [
      'session_start',
      'drop',
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
      }),
    );
  } finally {
    setTelemetrySink(previous);
  }
});

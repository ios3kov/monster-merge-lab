import type { GameMode } from './modes.ts';

export const TELEMETRY_EVENT_NAME = 'monster-merge:telemetry';

export type TelemetryContext = {
  mode: GameMode;
  experimentId?: string;
  dailyKey?: string;
};

export type TelemetryEventInput =
  | ({ name: 'session_start' } & TelemetryContext)
  | ({ name: 'run_start' } & TelemetryContext)
  | ({ name: 'drop'; tier: number; drops: number } & TelemetryContext)
  | ({ name: 'hold'; uses: number } & TelemetryContext)
  | ({ name: 'power_use'; uses: number } & TelemetryContext)
  | ({
      name: 'merge';
      tier: number;
      combo: number;
      merges: number;
      score: number;
    } & TelemetryContext)
  | ({ name: 'chain'; combo: number; score: number } & TelemetryContext)
  | ({ name: 'order_complete'; orderNo: number; reward: number } & TelemetryContext)
  | ({ name: 'overdrive_start'; score: number } & TelemetryContext)
  | ({ name: 'overdrive_end'; score: number } & TelemetryContext)
  | ({ name: 'danger_start'; score: number } & TelemetryContext)
  | ({ name: 'danger_end'; rescued: boolean; score: number } & TelemetryContext)
  | ({ name: 'game_over'; score: number; highestTier: number } & TelemetryContext)
  | ({ name: 'experiment_complete'; score: number; goalKind: string } & TelemetryContext)
  | ({ name: 'experiment_failed'; score: number; reason: 'drop_limit' } & TelemetryContext);

export type TelemetryEvent = TelemetryEventInput & {
  at: number;
  sequence: number;
};

export type TelemetrySink = (event: TelemetryEvent) => void;

let sink: TelemetrySink | null = null;
let sequence = 0;

export function setTelemetrySink(next: TelemetrySink | null) {
  const previous = sink;
  sink = next;
  return previous;
}

export function resetTelemetrySequence() {
  sequence = 0;
}

export function emitTelemetry(input: TelemetryEventInput) {
  const event = {
    ...input,
    at: Date.now(),
    sequence: ++sequence,
  } as TelemetryEvent;

  sink?.(event);

  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<TelemetryEvent>(TELEMETRY_EVENT_NAME, {
        detail: event,
      }),
    );
  }

  return event;
}

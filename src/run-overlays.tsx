import type { GameMode } from './modes';

export function RunOverlays({
  mode,
  score,
  bestScore,
  presetTitle,
  dailyKey,
  successLabel,
  experimentComplete,
  experimentFailed,
  gameOver,
  onRetry,
  onNextExperiment,
  onLab,
}: {
  mode: GameMode;
  score: number;
  bestScore: number;
  presetTitle: string;
  dailyKey?: string;
  successLabel?: string;
  experimentComplete: boolean;
  experimentFailed: boolean;
  gameOver: boolean;
  onRetry: () => void;
  onNextExperiment?: () => void;
  onLab: () => void;
}) {
  return (
    <>
      {experimentComplete && (
        <div
          className="game-over experiment-complete"
          role="dialog"
          aria-modal="true"
        >
          <div className="game-over-card">
            <span>EXPERIMENT COMPLETE</span>
            <h2>{successLabel ?? 'GOAL COMPLETE'}</h2>
            <p>Goal cleared in {score} points</p>
            <div className="completion-actions">
              <button autoFocus onClick={onRetry}>
                Retry
              </button>
              {onNextExperiment && (
                <button
                  aria-label="Next Experiment"
                  onClick={onNextExperiment}
                >
                  Next
                </button>
              )}
              <button onClick={onLab}>Lab</button>
            </div>
          </div>
        </div>
      )}

      {experimentFailed && !experimentComplete && (
        <div className="game-over" role="dialog" aria-modal="true">
          <div className="game-over-card">
            <span>EXPERIMENT FAILED</span>
            <h2>DROP LIMIT</h2>
            <p>Retry and solve it within the allowed drops.</p>
            <div className="completion-actions">
              <button autoFocus onClick={onRetry}>
                Retry
              </button>
              <button onClick={onLab}>Lab</button>
            </div>
          </div>
        </div>
      )}

      {gameOver && !experimentComplete && !experimentFailed && (
        <div className="game-over" role="dialog" aria-modal="true">
          <div className="game-over-card">
            <span>{mode === 'daily' ? 'DAILY OVER' : 'LAB OVERFLOW'}</span>
            <h2>{score}</h2>
            <p>
              {mode === 'endless'
                ? 'Best ' + String(bestScore)
                : mode === 'daily'
                  ? dailyKey
                  : presetTitle}
            </p>
            <button autoFocus onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

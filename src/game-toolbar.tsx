import { RotateCcw } from 'lucide-react';
import type { RunPreset } from './modes';

export function GameToolbar({
  preset,
  canDrop,
  gameOver,
  experimentComplete,
  experimentFailed,
  runPowerUses,
  powerCharges,
  powerUsesRemaining,
  onShop,
  onMonsters,
  onDrop,
  onPower,
  onLab,
}: {
  preset: RunPreset;
  canDrop: boolean;
  gameOver: boolean;
  experimentComplete: boolean;
  experimentFailed: boolean;
  runPowerUses: number;
  powerCharges: number;
  powerUsesRemaining: number;
  onShop: () => void;
  onMonsters: () => void;
  onDrop: () => void;
  onPower: () => void;
  onLab: () => void;
}) {
  return (
    <div className="concept-toolbar">
      <button
        type="button"
        onClick={onShop}
        className="wood-button shop-hit"
        aria-label="Shop"
      >
        SHOP
      </button>
      <button
        type="button"
        onClick={onMonsters}
        className="wood-button monsters-hit"
        aria-label="Monsters"
      >
        MONSTERS
      </button>
      <button
        type="button"
        onClick={onDrop}
        className="concept-drop-button drop-hit"
        disabled={!canDrop || gameOver || experimentFailed}
        aria-label="Drop monster"
      >
        DROP
      </button>
      <button
        type="button"
        onClick={onPower}
        className="wood-button power-hit"
        disabled={
          !preset.allowPower ||
          gameOver ||
          experimentComplete ||
          experimentFailed ||
          (preset.limits?.powerUses !== undefined &&
            runPowerUses >= preset.limits.powerUses)
        }
        aria-label={
          preset.allowPower
            ? preset.mode === 'experiments'
              ? 'Power-up. ' +
                String(powerUsesRemaining) +
                ' run uses remaining'
              : 'Power-up. ' + String(powerCharges) + ' available'
            : 'Power-up unavailable in this mode'
        }
      >
        <RotateCcw size={22} />
        <span>POWER</span>
        {powerUsesRemaining > 0 && (
          <b className="power-charge" aria-hidden="true">
            {powerUsesRemaining}
          </b>
        )}
      </button>
      <button
        type="button"
        onClick={onLab}
        className="wood-button lab-hit"
        aria-label="Lab and game modes"
      >
        LAB
      </button>
    </div>
  );
}

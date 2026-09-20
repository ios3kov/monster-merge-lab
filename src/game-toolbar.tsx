import { FlaskConical, Hammer, PawPrint, Store } from 'lucide-react';
import type { RunPreset } from './modes';

export function GameToolbar({
  preset,
  gameOver,
  experimentComplete,
  experimentFailed,
  runPowerUses,
  powerCharges,
  powerUsesRemaining,
  onShop,
  onMonsters,
  onPower,
  onLab,
}: {
  preset: RunPreset;
  gameOver: boolean;
  experimentComplete: boolean;
  experimentFailed: boolean;
  runPowerUses: number;
  powerCharges: number;
  powerUsesRemaining: number;
  onShop: () => void;
  onMonsters: () => void;
  onPower: () => void;
  onLab: () => void;
}) {
  return (
    <div className="reference-toolbar">
      <button
        type="button"
        onClick={onShop}
        className="reference-toolbar-button shop-hit"
        aria-label="Shop"
      >
        <Store size={23} />
        <span>SHOP</span>
      </button>
      <button
        type="button"
        onClick={onMonsters}
        className="reference-toolbar-button monsters-hit"
        aria-label="Monsters"
      >
        <PawPrint size={23} />
        <span>MONSTERS</span>
      </button>
      <button
        type="button"
        onClick={onPower}
        className="reference-toolbar-button power-hit"
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
        <Hammer size={23} />
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
        className="reference-toolbar-button lab-hit"
        aria-label="Lab and game modes"
      >
        <FlaskConical size={23} />
        <span>LAB</span>
      </button>
    </div>
  );
}

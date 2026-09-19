import { EXPERIMENTS } from './experiments';
import { MODE_OPTIONS, type GameMode, type RunPreset } from './modes';
import { MAX_TIER, TIER_DEFS } from './physics';
import { MonsterArt } from './rendering';

type CloseProps = {
  onClose: () => void;
};

export function MonstersModal({
  bestTier,
  onClose,
}: CloseProps & {
  bestTier: number;
}) {
  return (
    <div
      className="monster-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolution-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="monster-modal-card">
        <button
          autoFocus
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="evolution-title">MONSTER EVOLUTION</h2>
        <div className="evolution-grid">
          {TIER_DEFS.map((def, tier) => (
            <div
              key={def.name}
              className={tier <= bestTier + 1 ? '' : 'locked'}
            >
              <MonsterArt tier={tier} size={66} />
              <span>{def.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShopModal({
  persistentMetaEnabled,
  coins,
  powerCharges,
  powerCost,
  onBuyPower,
  onClose,
}: CloseProps & {
  persistentMetaEnabled: boolean;
  coins: number;
  powerCharges: number;
  powerCost: number;
  onBuyPower: () => void;
}) {
  return (
    <div
      className="monster-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="monster-modal-card shop-card">
        <button
          autoFocus
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="shop-title">SHOP</h2>
        <div className="shop-item">
          <MonsterArt tier={4} size={72} />
          <div>
            <strong>Pulse</strong>
            <span>
              {persistentMetaEnabled
                ? 'Loosens a crowded pile and creates new merge chances.'
                : 'Purchases are available in Endless Lab.'}
            </span>
          </div>
          <button
            type="button"
            className="buy-button"
            onClick={onBuyPower}
            disabled={!persistentMetaEnabled || coins < powerCost}
          >
            ● {powerCost}
          </button>
        </div>
        <p className="shop-stock">Owned: {powerCharges}</p>
      </div>
    </div>
  );
}

export function LabModal({
  preset,
  experimentComplete,
  experimentsCompleted,
  bestScore,
  persistentOrdersCompleted,
  bestTier,
  coins,
  onStartMode,
  onClose,
}: CloseProps & {
  preset: RunPreset;
  experimentComplete: boolean;
  experimentsCompleted: number;
  bestScore: number;
  persistentOrdersCompleted: number;
  bestTier: number;
  coins: number;
  onStartMode: (mode: GameMode) => void;
}) {
  return (
    <div
      className="monster-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="monster-modal-card lab-card">
        <button
          autoFocus
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="lab-title">LAB</h2>
        <div className="mode-grid" role="group" aria-label="Game modes">
          {MODE_OPTIONS.map((option) => {
            const active =
              option.id === preset.mode &&
              !(option.id === 'experiments' && experimentComplete);
            return (
              <button
                type="button"
                className={'mode-card' + (active ? ' is-active' : '')}
                key={option.id}
                disabled={active}
                onClick={() => onStartMode(option.id)}
              >
                <strong>{option.title}</strong>
                <span>
                  {option.id === 'experiments' && !active
                    ? experimentsCompleted >= EXPERIMENTS.length
                      ? 'All 12 complete. Replay from Experiment 1.'
                      : experimentsCompleted > 0
                        ? 'Continue with Experiment ' +
                          String(experimentsCompleted + 1) +
                          ' of ' +
                          String(EXPERIMENTS.length) +
                          '.'
                        : option.description
                    : option.description}
                </span>
                <b>
                  {active
                    ? 'ACTIVE'
                    : option.id === 'experiments' &&
                        experimentsCompleted >= EXPERIMENTS.length
                      ? 'REPLAY'
                      : option.id === 'experiments' &&
                          experimentsCompleted > 0
                        ? 'CONTINUE'
                        : 'START'}
                </b>
              </button>
            );
          })}
        </div>
        <dl className="lab-stats">
          <div>
            <dt>Current mode</dt>
            <dd>{preset.title}</dd>
          </div>
          <div>
            <dt>Experiments completed</dt>
            <dd>
              {experimentsCompleted}/{EXPERIMENTS.length}
            </dd>
          </div>
          <div>
            <dt>Best score</dt>
            <dd>{bestScore}</dd>
          </div>
          <div>
            <dt>Orders completed</dt>
            <dd>{persistentOrdersCompleted}</dd>
          </div>
          <div>
            <dt>Highest evolution</dt>
            <dd>{TIER_DEFS[Math.min(bestTier, MAX_TIER)]!.name}</dd>
          </div>
          <div>
            <dt>Coins</dt>
            <dd>{coins}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

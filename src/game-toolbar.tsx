import type { RunPreset } from './modes';

export function GameToolbar({
  preset,
  gameOver,
  experimentComplete,
  experimentFailed,
  onShop,
  onBook,
  onLab,
  onRestart,
}: {
  preset: RunPreset;
  gameOver: boolean;
  experimentComplete: boolean;
  experimentFailed: boolean;
  onShop: () => void;
  onBook: () => void;
  onLab: () => void;
  onRestart: () => void;
}) {
  const restartDisabled = gameOver || experimentComplete || experimentFailed;

  return (
    <nav className="reference-toolbar" aria-label="Game actions">
      <button
        type="button"
        onClick={onShop}
        className="reference-toolbar-hit reference-toolbar-hit--shop"
        aria-label="Shop"
      />
      <button
        type="button"
        onClick={onLab}
        className="reference-toolbar-hit reference-toolbar-hit--lab"
        aria-label="Lab and game modes"
      />
      <button
        type="button"
        onClick={onBook}
        className="reference-toolbar-hit reference-toolbar-hit--book"
        aria-label="Monster book"
      />
      <button
        type="button"
        onClick={onRestart}
        className="reference-toolbar-hit reference-toolbar-hit--restart"
        aria-label={restartDisabled ? 'Restart run' : 'Restart current run'}
      />
      <span className="sr-only" aria-hidden="true">
        {preset.title}
      </span>
    </nav>
  );
}

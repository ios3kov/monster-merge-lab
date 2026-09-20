import { BookOpen, FlaskConical, RotateCcw, Store } from 'lucide-react';

export function GameToolbar({
  onShop,
  onLab,
  onBook,
  onRestart,
}: {
  onShop: () => void;
  onLab: () => void;
  onBook: () => void;
  onRestart: () => void;
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
        onClick={onLab}
        className="reference-toolbar-button lab-hit"
        aria-label="Lab and game modes"
      >
        <FlaskConical size={23} />
        <span>LAB</span>
      </button>
      <button
        type="button"
        onClick={onBook}
        className="reference-toolbar-button book-hit"
        aria-label="Monster book"
      >
        <BookOpen size={23} />
        <span>BOOK</span>
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="reference-toolbar-button restart-hit"
        aria-label="Restart run"
      >
        <RotateCcw size={24} />
        <span>RESTART</span>
      </button>
    </div>
  );
}

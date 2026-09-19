import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Monster Merge Lab crashed', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <div>
          <strong>Lab needs a restart</strong>
          <span>Your saved coins and progress are safe.</span>
          <button type="button" onClick={() => window.location.reload()}>
            Reload game
          </button>
        </div>
      </main>
    );
  }
}

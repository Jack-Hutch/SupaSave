import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional label so we can tell which boundary tripped (e.g. "page", "app"). */
  scope?: string;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/runtime errors in the React subtree and shows a recovery UI
 * instead of letting the whole app unmount to a black screen.
 *
 * Why this exists: previously a single thrown error (a malformed date, bad
 * chart data, an undefined field) would unmount the entire tree, leaving the
 * near-black `bg-gray-950` body with no way back except a manual reload. This
 * boundary keeps the chrome alive and offers "Try again" (re-mount the subtree)
 * and "Reload" (hard refresh) so a transient error never bricks the session.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface in the console for debugging; in prod this could ship to a logger.
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ''}]`, error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-foreground-muted mb-1">
            This section hit an unexpected error, but the rest of the app is fine.
          </p>
          <p className="text-xs text-foreground-subtle mb-6 font-mono break-words">
            {error.message || 'Unknown error'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'rgb(var(--accent))' }}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-foreground border border-border-base hover:bg-surface-raised transition-colors"
            >
              <Home className="h-4 w-4" />
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

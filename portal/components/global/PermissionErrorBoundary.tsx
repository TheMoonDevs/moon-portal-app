'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Component } from 'react';

import { PermissionError } from '@/lib/permissions/PermissionError';

interface PermissionErrorFallbackProps {
  error: PermissionError;
  onReset: () => void;
}

function PermissionErrorFallback({
  error,
  onReset,
}: PermissionErrorFallbackProps) {
  return (
    <div className="flex min-h-[240px] w-full flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-red-300 bg-red-50 p-8 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="size-7" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-red-900">
            Access restricted
          </h2>
          <p className="text-sm text-red-800">
            {error.message ||
              'You do not have permission to perform this action.'}
          </p>
          {error.requiredPermission && (
            <p className="text-xs text-red-700">
              Required policy:{' '}
              <code className="rounded bg-red-100 px-1 py-0.5 font-mono">
                {error.requiredPermission}
              </code>
            </p>
          )}
        </div>
        <p className="text-xs text-red-700">
          Ask an admin to grant you access, then try again.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-100"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

interface PermissionErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback renderer for permission errors. */
  renderFallback?: (error: PermissionError, reset: () => void) => ReactNode;
}

interface PermissionErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary that renders an "access restricted" panel when a
 * `PermissionError` is thrown DURING RENDER by its subtree. Any other error is
 * re-thrown so an outer boundary (or the Next.js error page) can handle it.
 *
 * Note: most of the app's data hooks catch fetch errors into local state
 * rather than throwing during render, so day-to-day 403s surface through the
 * app-wide `PermissionDeniedToaster` (a toast), not this boundary. This
 * boundary is the defensive full-page fallback for components that DO throw a
 * `PermissionError` while rendering.
 */
export class PermissionErrorBoundary extends Component<
  PermissionErrorBoundaryProps,
  PermissionErrorBoundaryState
> {
  constructor(props: PermissionErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): PermissionErrorBoundaryState {
    return { error };
  }

  reset() {
    if (this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;

    if (error) {
      // Only permission errors belong to this boundary; rethrow anything else
      // so an outer boundary (or Next.js error page) can handle it.
      if (!(error instanceof PermissionError)) {
        throw error;
      }
      if (this.props.renderFallback) {
        return this.props.renderFallback(error, this.reset);
      }
      return <PermissionErrorFallback error={error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

export default PermissionErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Centrally log error trace to diagnostics
    console.error("Uncaught Error Boundary Exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
          <div className="max-w-lg w-full rounded-3xl border border-red-500/20 bg-red-950/10 p-8 shadow-2xl backdrop-blur-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50 border border-red-500/30">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="mt-6 text-2xl font-bold text-slate-100">Application Error</h2>
            <p className="mt-2 text-sm text-slate-400">
              An unexpected crash occurred in the frontend component tree. The details of the crash are captured below:
            </p>
            
            {this.state.error && (
              <div className="mt-6 text-left">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Error Details</span>
                <pre className="mt-1 overflow-x-auto rounded-xl bg-slate-900/80 border border-slate-800 p-4 font-mono text-[11px] text-red-400 max-h-48">
                  {this.state.error.stack || this.state.error.toString()}
                </pre>
              </div>
            )}
            
            <div className="mt-8 flex gap-4">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-98"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    // Clear state in-place without triggering window.location.reload()
    try {
      localStorage.removeItem('NATIVITY_ANALOGY_CACHE');
      localStorage.removeItem('NATIVITY_ANALOGY_CACHE_Easy');
      localStorage.removeItem('NATIVITY_ANALOGY_CACHE_Standard');
      localStorage.removeItem('NATIVITY_ANALOGY_CACHE_Challenging');
      localStorage.removeItem('NATIVITY_ANALOGY_CACHE_Advanced');
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-glass p-8 rounded-3xl max-w-lg mx-auto text-center space-y-4 my-8">
          <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Render Notice
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-300 font-mono p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 break-words text-left">
            {this.state.error?.message || 'Unexpected application error'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Card State</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

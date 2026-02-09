import React, { ReactNode, ErrorInfo, Component } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches errors in child components and displays a fallback UI
 * instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details in development
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // You could also log this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return (
        fallback || (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
            <div className="text-center space-y-6 p-8 max-w-md">
              <h1 className="text-4xl font-bold glitch-effect text-[var(--theme-primary)]" data-text="ERROR">
                ERRO CRITÍCO!
              </h1>
              
              <p className="text-[var(--theme-text-secondary)]">
                Algo de errado acabou de acontecer, O espaço tempo foi corrompido e a aplicação não pode continuar. Por favor, tente novamente ou retorne para a página inicial.
              </p>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-left text-sm text-[var(--theme-text-secondary)] bg-[var(--theme-bg-secondary)] p-4 rounded border border-[var(--theme-border-primary)] max-h-48 overflow-auto">
                  <summary className="cursor-pointer font-bold mb-2 text-[var(--theme-text-primary)]">
                    Error Details
                  </summary>
                  <pre className="whitespace-pre-wrap break-words">
                    {error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-bg-primary)] rounded font-bold hover:brightness-110 transition-all"
                >
                  Try Again
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded hover:border-[var(--theme-primary)] transition-colors"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return children;
  }
}

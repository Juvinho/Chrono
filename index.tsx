
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: '#1a1a1a', height: '100vh', fontFamily: 'monospace', overflow: 'auto' }}>
          <h1 style={{ color: '#ff4444' }}>System Malfunction Detected</h1>
          <p>The application has encountered a critical error.</p>
          <div style={{ background: '#000', padding: '15px', borderRadius: '5px', border: '1px solid #333', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>Error Log:</h3>
            <pre style={{ color: '#ff4444', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.toString()}
            </pre>
            {this.state.error?.stack && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#888' }}>Stack Trace</summary>
                <pre style={{ fontSize: '12px', color: '#666', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              marginTop: '20px', 
              cursor: 'pointer', 
              background: '#00f0ff', 
              color: '#000',
              border: 'none', 
              fontWeight: 'bold',
              borderRadius: '3px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

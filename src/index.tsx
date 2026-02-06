
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SoundProvider } from './contexts/SoundContext';
import { ToastProvider } from './contexts/ToastContext';
import { FloatingChatProvider } from './contexts/FloatingChatContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Auto-reload on chunk load failure (common after deployments)
    if (error.message.includes('Failed to fetch dynamically imported module') || 
        error.message.includes('Importing a module script failed')) {
        
        const storageKey = 'chunk_load_error_reload';
        const hasReloaded = sessionStorage.getItem(storageKey);
        
        if (!hasReloaded) {
            sessionStorage.setItem(storageKey, 'true');
            window.location.reload();
        } else {
            // Clear flag so next time it can try again if needed
            // But for this session, we stop looping
             sessionStorage.removeItem(storageKey);
        }
    }
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

    return (this as any).props.children;
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
      <FloatingChatProvider>
        <SoundProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </SoundProvider>
      </FloatingChatProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

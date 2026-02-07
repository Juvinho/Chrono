import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminContext';
import './admin-login.css';

const LockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Senha é obrigatória');
      return;
    }

    setIsLoading(true);

    try {
      await login(password);
      // Navegação automática via context
    } catch (err: any) {
      setError(err.message || 'Senha incorreta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <div className="admin-icon-wrapper">
            <div className="admin-icon" style={{ color: '#667eea' }}>
              <LockIcon />
            </div>
          </div>
          <h1>Acesso Administrativo</h1>
          <p>Digite a senha master para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-login-error">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">
              <LockIcon />
              Senha Master
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha master"
              autoFocus
              disabled={isLoading}
              className="admin-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="admin-login-button"
          >
            {isLoading ? 'Verificando...' : 'Entrar como Admin'}
          </button>
        </form>

        <div className="admin-login-footer">
          <button
            onClick={() => navigate('/')}
            className="back-to-site-button"
          >
            <ArrowLeftIcon />
            Voltar ao site
          </button>
        </div>
      </div>
    </div>
  );
}

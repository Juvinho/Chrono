import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api';

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando seu email...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await apiClient.get<VerificationResult>(`/auth/email-verification/verify/${token}`);

      if (response.error) {
        setStatus('error');
        setMessage(response.error);
        return;
      }

      const data = response.data;

      if (data?.success) {
        setStatus('success');
        setMessage(data.message || 'Seu email foi verificado com sucesso! Agora você pode entrar com o mesmo email e senha.');
        setUser(data.user);
      } else {
        setStatus('error');
        setMessage('Erro ao verificar email');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message || 'Erro ao verificar email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050508] via-[#0a0a1a] to-[#12121f] flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--theme-primary,#7c3aed)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-[#0c0c14]/90 backdrop-blur-xl border border-[#1a1a2e] rounded-sm p-10 text-center shadow-[0_0_60px_rgba(124,58,237,0.1)]">
          
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[var(--theme-primary,#7c3aed)] to-cyan-400 mb-1">
              CHRONO
            </h1>
            <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[var(--theme-primary,#7c3aed)] to-transparent mx-auto" />
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="py-12">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-[var(--theme-primary,#7c3aed)]/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-[var(--theme-primary,#7c3aed)] rounded-full animate-spin" />
              </div>
              <p className="text-[#666] text-sm font-mono tracking-wider animate-pulse">
                VERIFICANDO...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="py-6">
              {/* Check icon */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 border-2 border-green-500/30 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="text-3xl font-black text-white mb-2">
                Email Verificado
              </h2>
              <p className="text-xl text-green-400 font-bold mb-6">
                Bem-vindo ao Chrono! 🎉
              </p>
              <p className="text-[#9aa] text-sm mb-6">
                {message}
              </p>

              {user && (
                <div className="bg-[#111118] border border-[#1e1e30] rounded-sm p-4 mb-8 text-left">
                  <p className="text-[#555] text-xs font-mono uppercase tracking-widest mb-2">Conta Verificada</p>
                  <p className="text-[var(--theme-primary,#7c3aed)] font-bold text-lg">@{user.username}</p>
                  <p className="text-[#666] text-sm">{user.email}</p>
                </div>
              )}

              <button
                onClick={() => navigate('/login', {
                  state: {
                    message: 'Email verificado! Faça login para continuar.',
                    email: user?.email
                  }
                })}
                className="w-full relative group py-4 px-6 bg-gradient-to-r from-[var(--theme-primary,#7c3aed)] to-[var(--theme-secondary,#6d28d9)] text-white font-black text-lg tracking-wider rounded-sm transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10">ENTRAR NO CHRONO →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary,#7c3aed)] to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-lg tracking-wider opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  ENTRAR NO CHRONO →
                </span>
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="py-6">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-2 border-red-500/30 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-black text-red-400 mb-3">
                Erro na Verificação
              </h2>
              <p className="text-[#888] mb-8 text-sm leading-relaxed">
                {message || 'O link de verificação pode estar expirado ou inválido.'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 px-6 bg-[var(--theme-primary,#7c3aed)] text-white font-bold tracking-wider rounded-sm hover:bg-[var(--theme-secondary,#6d28d9)] transition-colors"
                >
                  REGISTRAR NOVAMENTE
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 px-6 bg-transparent text-[var(--theme-primary,#7c3aed)] font-bold tracking-wider rounded-sm border border-[var(--theme-primary,#7c3aed)]/30 hover:bg-[var(--theme-primary,#7c3aed)]/10 transition-colors"
                >
                  ← VOLTAR AO LOGIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[#444] text-xs font-mono tracking-widest">
          <p>© 2026 CHRONO</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

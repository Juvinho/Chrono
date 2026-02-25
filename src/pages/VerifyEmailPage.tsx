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
      setMessage('❌ Token de verificação não encontrado');
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
        setMessage(`✅ ${data.message}`);
        setUser(data.user);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Email verificado! Faça login para continuar.',
              email: data.user?.email
            }
          });
        }, 3000);
      } else {
        setStatus('error');
        setMessage('Erro ao verificar email');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ ${error?.message || 'Erro ao verificar email'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-[#0a0a0a] border border-[#333] rounded-2xl p-8 text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#0084ff] mb-2">⏱️ CHRONO</h1>
            <p className="text-[#666] text-sm">Rede Social Temporal</p>
          </div>

          {/* Status Indicator */}
          <div className="mb-8">
            {status === 'loading' && (
              <div className="flex justify-center">
                <div className="animate-spin text-4xl">⌛</div>
              </div>
            )}
            {status === 'success' && (
              <div className="text-5xl">✅</div>
            )}
            {status === 'error' && (
              <div className="text-5xl">❌</div>
            )}
          </div>

          {/* Message */}
          <h2 className={`text-2xl font-bold mb-4 ${
            status === 'success' ? 'text-green-500' :
            status === 'error' ? 'text-red-500' :
            'text-[#0084ff]'
          }`}>
            {status === 'loading' ? 'Verificando...' :
             status === 'success' ? 'Email Verificado!' :
             'Erro na Verificação'}
          </h2>

          <p className="text-[#999] mb-6 leading-relaxed">
            {message}
          </p>

          {/* User Info */}
          {user && status === 'success' && (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 mb-6 text-left">
              <p className="text-[#666] text-sm mb-2">Usuário Verificado:</p>
              <p className="text-[#0084ff] font-semibold">@{user.username}</p>
              <p className="text-[#666] text-sm">{user.email}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'success' && (
              <>
                <p className="text-[#666] text-sm mb-4">
                  🎉 Redirecionando para login em alguns segundos...
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#0084ff] hover:bg-[#0073e6] text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  → Ir para Login Agora
                </button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <p className="text-[#666] text-sm mb-4">
                  O link de verificação pode estar expirado ou inválido.
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-[#0084ff] hover:bg-[#0073e6] text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  → Registrar Novamente
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#0084ff] font-semibold py-3 rounded-lg transition-colors border border-[#333]"
                >
                  ← Voltar para Login
                </button>
              </>
            )}
          </div>

          {/* Help Text */}
          {status === 'error' && (
            <div className="mt-6 pt-6 border-t border-[#333]">
              <p className="text-[#666] text-sm mb-3">Precisa de ajuda?</p>
              <a
                href="mailto:support@chrono.com"
                className="text-[#0084ff] hover:underline text-sm"
              >
                📧 Contate nosso suporte
              </a>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-[#666] text-xs">
          <p>© 2026 Chrono - Rede Social Temporal</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

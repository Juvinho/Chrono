import React, { useState, useEffect } from 'react';
import { User } from '../../../types/index';
import { AlertIcon, CheckIcon, XIcon } from '../../../components/ui/icons';
import { apiClient } from '../../../api';

interface EmailVerificationBannerProps {
  user: User;
  onVerified?: () => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  user,
  onVerified
}) => {
  const [status, setStatus] = useState<'loading' | 'verified' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, [user.id]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const checkVerificationStatus = async () => {
    try {
      const response = await apiClient.get('/auth/email-verification/status');
      const { email_verified } = response.data;

      if (email_verified) {
        setStatus('verified');
        setMessage('✅ Email verificado com sucesso!');
        if (onVerified) {
          onVerified();
        }
      } else {
        setStatus('pending');
        setMessage('⏳ Verifique seu email para continuar');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Erro ao verificar status do email');
    }
  };

  const handleResendEmail = async () => {
    try {
      setIsSending(true);
      await apiClient.post('/auth/email-verification/send');
      
      setMessage('✉️ Email de verificação reenviado!');
      setCanResend(false);
      setResendCountdown(60); // 60 seconds countdown
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Erro ao reenviar email';
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  if (status === 'verified') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
        <CheckIcon className="w-5 h-5 text-green-500" />
        <div className="flex-1">
          <p className="text-green-500 font-medium">{message}</p>
          <p className="text-green-500/70 text-sm">Sua conta está totalmente verificada</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertIcon className="w-5 h-5 text-blue-500" />
          <p className="text-blue-500 font-medium">{message}</p>
        </div>

        <p className="text-blue-500/70 text-sm mb-4">
          Enviamos um email de verificação para <strong>{user.email}</strong>. 
          Clique no link no email para ativar sua conta.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleResendEmail}
            disabled={!canResend || isSending}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              canResend && !isSending
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 cursor-pointer'
                : 'bg-blue-500/10 text-blue-400/50 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <>
                <span className="inline-block animate-spin mr-2">⌛</span>
                Enviando...
              </>
            ) : canResend ? (
              '📨 Reenviar Email'
            ) : (
              `Reenviar em ${resendCountdown}s`
            )}
          </button>

          <a
            href={`mailto:${user.email}`}
            className="px-4 py-2 rounded-lg font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
          >
            ✉️ Abrir Email
          </a>
        </div>

        <p className="text-blue-500/50 text-xs mt-3">
          💡 Verifique sua pasta de spam se não recebeu o email
        </p>
      </div>
    );
  }

  return null;
};

export default EmailVerificationBanner;

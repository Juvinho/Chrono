import React, { useState } from 'react';
import { authService } from '../../../api/auth.service';

interface TwoFactorSetupProps {
  onClose: () => void;
}

type Step = 'idle' | 'scanning' | 'confirming' | 'recovery' | 'done';

export default function TwoFactorSetup({ onClose }: TwoFactorSetupProps) {
  const [step, setStep] = useState<Step>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Check status on mount
  React.useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    const res = await authService.get2FAStatus();
    if (res.data) {
      setIs2FAEnabled(res.data.enabled);
    }
  };

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authService.setup2FA();
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setQrCodeDataUrl(res.data.qrCodeDataUrl);
        setSecret(res.data.secret);
        setStep('scanning');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await authService.confirm2FA(secret, code);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
        setStep('recovery');
        setIs2FAEnabled(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setError('Digite sua senha para desativar');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await authService.disable2FA(disablePassword);
      if (res.error) {
        setError(res.error);
        return;
      }
      setIs2FAEnabled(false);
      setDisablePassword('');
      setStep('idle');
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--theme-text-light)] uppercase tracking-widest">
          ◈ Autenticação de Dois Fatores (2FA)
        </h3>
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded ${
        is2FAEnabled
          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
          : 'bg-red-500/10 border border-red-500/30 text-red-400'
      }`}>
        <span className={`w-2 h-2 rounded-full ${is2FAEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
        {is2FAEnabled ? 'ATIVO' : 'INATIVO'}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30">
          {error}
        </div>
      )}

      {/* ─── IDLE / ENABLED STATE ─────────────────────── */}
      {step === 'idle' && !is2FAEnabled && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--theme-text-secondary)]">
            Adicione uma camada extra de segurança à sua conta. 
            Você precisará de um aplicativo autenticador (Google Authenticator, Authy, etc.).
          </p>
          <button
            onClick={handleStartSetup}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[var(--theme-primary)] text-white font-bold text-sm hover:bg-[var(--theme-secondary)] transition-colors border border-[var(--theme-secondary)] disabled:opacity-50"
          >
            {isLoading ? '[ CARREGANDO... ]' : '[ ATIVAR 2FA ]'}
          </button>
        </div>
      )}

      {step === 'idle' && is2FAEnabled && (
        <div className="space-y-3">
          <p className="text-xs text-green-400/70">
            Sua conta está protegida com autenticação de dois fatores.
          </p>
          <div className="space-y-2">
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Senha para desativar"
              className="w-full px-3 py-2 text-sm text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={handleDisable}
              disabled={isLoading || !disablePassword}
              className="w-full py-2 px-4 bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors border border-red-500/30 disabled:opacity-50"
            >
              {isLoading ? '[ DESATIVANDO... ]' : '[ DESATIVAR 2FA ]'}
            </button>
          </div>
        </div>
      )}

      {/* ─── SCANNING QR CODE ─────────────────────────── */}
      {step === 'scanning' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--theme-text-secondary)]">
            Escaneie o QR code abaixo no seu aplicativo autenticador:
          </p>

          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-sm border-2 border-[var(--theme-primary)] shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <img src={qrCodeDataUrl} alt="QR Code 2FA" className="w-48 h-48" width={192} height={192} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-[var(--theme-text-secondary)] uppercase tracking-widest text-center">
              Ou adicione manualmente:
            </p>
            <div className="p-2 bg-black/50 border border-[var(--theme-border-primary)] text-center">
              <code className="text-xs text-[var(--theme-primary)] font-mono break-all select-all">
                {secret}
              </code>
            </div>
          </div>

          <button
            onClick={() => setStep('confirming')}
            className="w-full py-2.5 px-4 bg-[var(--theme-primary)] text-white font-bold text-sm hover:bg-[var(--theme-secondary)] transition-colors border border-[var(--theme-secondary)]"
          >
            [ PRÓXIMO → ]
          </button>
        </div>
      )}

      {/* ─── CONFIRM CODE ─────────────────────────────── */}
      {step === 'confirming' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--theme-text-secondary)]">
            Digite o código de 6 dígitos exibido no seu autenticador para confirmar:
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            className="w-full px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] text-[var(--theme-primary)] bg-black/50 border-2 border-[var(--theme-primary)] focus:outline-none shadow-[0_0_10px_rgba(124,58,237,0.3)]"
          />

          <div className="flex gap-2">
            <button
              onClick={() => { setStep('scanning'); setCode(''); setError(''); }}
              className="flex-1 py-2 px-4 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] text-sm hover:text-[var(--theme-text-primary)] transition-colors border border-[var(--theme-border-primary)]"
            >
              ← Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || code.length !== 6}
              className="flex-1 py-2 px-4 bg-[var(--theme-primary)] text-white font-bold text-sm hover:bg-[var(--theme-secondary)] transition-colors border border-[var(--theme-secondary)] disabled:opacity-50"
            >
              {isLoading ? '[ VERIFICANDO... ]' : '[ CONFIRMAR ]'}
            </button>
          </div>
        </div>
      )}

      {/* ─── RECOVERY CODES ───────────────────────────── */}
      {step === 'recovery' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 text-xs font-bold mb-1">⚠ GUARDE ESTES CÓDIGOS</p>
            <p className="text-amber-400/70 text-[10px]">
              Estes códigos de recuperação só serão exibidos UMA VEZ. 
              Salve-os em um local seguro. Cada código só pode ser usado uma vez.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-black/50 border border-[var(--theme-border-primary)]">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="text-center font-mono text-sm text-[var(--theme-text-light)] py-1">
                {code}
              </div>
            ))}
          </div>

          <button
            onClick={copyRecoveryCodes}
            className={`w-full py-2 px-4 text-sm font-bold transition-colors border ${
              copied
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)]'
            }`}
          >
            {copied ? '✓ COPIADOS' : '◫ COPIAR CÓDIGOS'}
          </button>

          <button
            onClick={() => { setStep('idle'); onClose(); }}
            className="w-full py-2.5 px-4 bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 transition-colors border border-green-500/30"
          >
            [ ✓ CONCLUÍDO ]
          </button>
        </div>
      )}
    </div>
  );
}

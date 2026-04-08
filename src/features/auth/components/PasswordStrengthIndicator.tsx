import React, { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface StrengthResult {
  score: number; // 0-4
  label: string; // 'Fraco', 'Médio', 'Forte', 'Muito Forte'
  color: string; // CSS class for color
  percentage: number; // 0-100
}

const calculatePasswordStrength = (password: string): StrengthResult => {
  let score = 0;
  
  // Minimum length check (8+ characters = 1 point)
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++; // Lowercase letters
  if (/[A-Z]/.test(password)) score++; // Uppercase letters
  if (/\d/.test(password)) score++; // Numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++; // Special characters
  
  // Normalize score to 0-4 range
  const normalizedScore = Math.min(Math.floor(score / 1.5), 4);
  
  let label = '';
  let color = '';
  let percentage = 0;
  
  switch (normalizedScore) {
    case 0:
    case 1:
      label = 'Muito Fraco';
      color = 'from-red-600 to-red-500';
      percentage = 25;
      break;
    case 2:
      label = 'Fraco';
      color = 'from-orange-600 to-orange-500';
      percentage = 50;
      break;
    case 3:
      label = 'Forte';
      color = 'from-yellow-600 to-yellow-500';
      percentage = 75;
      break;
    case 4:
      label = 'Muito Forte';
      color = 'from-green-600 to-green-500';
      percentage = 100;
      break;
    default:
      label = 'Muito Fraco';
      color = 'from-red-600 to-red-500';
      percentage = 0;
  }
  
  return {
    score: normalizedScore,
    label,
    color,
    percentage,
  };
};

const Requirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-500' : 'text-[var(--theme-text-secondary)]'}`}>
    <div className={`w-4 h-4 rounded flex items-center justify-center ${met ? 'bg-green-500/20 border border-green-500' : 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]'}`}>
      {met && <span className="text-green-500 font-bold text-xs">✓</span>}
    </div>
    <span>{text}</span>
  </div>
);

export default function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  
  const requirements = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }),
    [password]
  );

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--theme-text-secondary)]">Força da Senha</span>
          <span className={`text-xs font-bold ${
            strength.score === 0 || strength.score === 1 ? 'text-red-500' :
            strength.score === 2 ? 'text-orange-500' :
            strength.score === 3 ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${strength.color} transition-all duration-300`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-2 p-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded">
          <Requirement met={requirements.length} text="Mínimo 8 caracteres" />
          <Requirement met={requirements.uppercase} text="Letra MAIÚSCULA" />
          <Requirement met={requirements.lowercase} text="Letra minúscula" />
          <Requirement met={requirements.numbers} text="Números (0-9)" />
          <Requirement met={requirements.special} text="Caracteres especiais" />
          <div className="text-xs text-[var(--theme-text-secondary)] flex items-center gap-1">
            <span>{strength.score + 1}/5 requisitos</span>
          </div>
        </div>
      )}
    </div>
  );
}

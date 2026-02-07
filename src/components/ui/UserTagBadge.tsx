import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface UserTagBadgeProps {
  tag: {
    id: string;
    nome: string;
    icone: string;
    cor_hex: string;
    cor_border: string;
    categoria: 'positive' | 'moderation' | 'time' | 'style';
    descricao_publica: string;
    adquirida_em: string;
  };
  showTooltip?: boolean;
}

const UserTagBadge: React.FC<UserTagBadgeProps> = ({ tag, showTooltip = true }) => {
  const [showDescription, setShowDescription] = useState(false);
  const { t } = useTranslation();

  // Ensure sufficient contrast for WCAG AA compliance
  const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Luminance calculation (WCAG)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch {
      return dateString;
    }
  };

  const textColor = getTextColor(tag.cor_hex);

  return (
    <div className="relative inline-block">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-sm cursor-help transition-all hover:shadow-md"
        style={{
          backgroundColor: tag.cor_hex,
          color: textColor,
          border: `2px solid ${tag.cor_border}`,
        }}
        onMouseEnter={() => setShowDescription(true)}
        onMouseLeave={() => setShowDescription(false)}
        title={showTooltip ? tag.descricao_publica : undefined}
      >
        <span className="text-lg">{tag.icone}</span>
        <span>{tag.nome}</span>
      </div>

      {/* Tooltip with description */}
      {showTooltip && showDescription && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg"
          style={{
            pointerEvents: 'none',
          }}
        >
          <p className="font-medium">{tag.descricao_publica}</p>
          <p className="text-gray-300 text-xs mt-1">
            {t('acquiredOn')}: {formatDate(tag.adquirida_em)}
          </p>
          {/* Arrow pointing down */}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: '#111827' }}
          />
        </div>
      )}
    </div>
  );
};

export default UserTagBadge;

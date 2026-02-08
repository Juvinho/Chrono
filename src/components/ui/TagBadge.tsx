import React from 'react';

// Inline types to avoid circular dependencies
interface TagInfo {
  id?: string;
  nome?: string;
  icone?: string;
  cor_hex?: string;
  cor_border?: string;
  descricao_publica?: string;
}

interface UserTagInfo {
  id?: string;
  adquirida_em?: Date;
  tag?: TagInfo;
}

interface TagBadgeProps {
  tag: UserTagInfo | TagInfo | any;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
}

/**
 * Helper: Calculate contrasting text color (must be defined first)
 */
const calculateContrastColor = (hexColor?: string): string => {
  try {
    if (!hexColor || typeof hexColor !== 'string') {
      return '#FFFFFF';
    }

    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#FFFFFF';

    const red = parseInt(hex.substring(0, 2), 16);
    const green = parseInt(hex.substring(2, 4), 16);
    const blue = parseInt(hex.substring(4, 6), 16);

    if (isNaN(red) || isNaN(green) || isNaN(blue)) {
      return '#FFFFFF';
    }

    // Luminance calculation 
    const lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return lum > 0.5 ? '#000000' : '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
};

/**
 * TagBadge Component
 */
export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'md',
  showTitle = true,
  className = ''
}) => {
  if (!tag) return null;

  // Extract tag definition
  const isUserTag = tag && 'adquirida_em' in tag && tag.tag;
  const tagDef = isUserTag ? tag.tag : tag;

  if (!tagDef || !tagDef.nome) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconClasses: Record<string, string> = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const bgColor = tagDef.cor_hex || '#9333ea';
  const borderColor = tagDef.cor_border || '#a855f7';
  const textColor = calculateContrastColor(bgColor);

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size] || sizeClasses.md} rounded-full border font-semibold transition-transform hover:scale-105 cursor-default ${className}`}
      style={{ backgroundColor: bgColor, borderColor, color: textColor }}
      title={tagDef.descricao_publica}
    >
      <span className={`${iconClasses[size] || iconClasses.md} flex items-center justify-center flex-shrink-0`}>
        {tagDef.icone || '✓'}
      </span>
      {showTitle && <span className="whitespace-nowrap">{tagDef.nome}</span>}
    </div>
  );
};

/**
 * TagBadgeGroup Component
 */
interface TagBadgeGroupProps {
  tags?: (UserTagInfo | TagInfo | any)[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TagBadgeGroup: React.FC<TagBadgeGroupProps> = ({
  tags = [],
  maxVisible = 3,
  size = 'md',
  className = ''
}) => {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {visibleTags.map((tag: any, idx: number) => {
        if (!tag) return null;
        const key = `tag-${idx}`;
        return (
          <TagBadge 
            key={key} 
            tag={tag} 
            size={size} 
            showTitle={true} 
          />
        );
      })}
    </div>
  );
};

export default TagBadge;

import React from 'react';
import { UserTag, TagDefinition } from '../../types/index';

interface TagBadgeProps {
  tag: UserTag | TagDefinition;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
}

/**
 * TagBadge Component
 * Displays a single user tag/badge with icon and styling
 *
 * @example
 * <TagBadge tag={userTag} size="md" showTitle={true} />
 */
export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'md',
  showTitle = true,
  className = ''
}) => {
  const isUserTag = 'adquirida_em' in tag;
  const tagDef = isUserTag ? (tag as UserTag).tag : (tag as TagDefinition);

  if (!tagDef) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const dynamicStyle = {
    backgroundColor: tagDef.cor_hex,
    borderColor: tagDef.cor_border,
    color: getContrastColor(tagDef.cor_hex)
  };

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full border-1.5 font-semibold transition-transform hover:scale-105 cursor-default ${className}`}
      style={dynamicStyle}
      title={tagDef.descricao_publica}
    >
      <span className={`${iconSizes[size]} flex items-center justify-center`}>
        {tagDef.icone}
      </span>
      {showTitle && <span className="whitespace-nowrap">{tagDef.nome}</span>}
    </div>
  );
};

/**
 * TagBadgeGroup Component
 * Displays multiple user tags with "Ver mais" option for overflow
 *
 * @example
 * <TagBadgeGroup tags={userTags} maxVisible={3} />
 */
interface TagBadgeGroupProps {
  tags?: (UserTag | TagDefinition)[];
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
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {visibleTags.map((tag, idx) => {
        const tagId = 'adquirida_em' in tag ? tag.id : tag.id;
        return <TagBadge key={`${tagId}-${idx}`} tag={tag} size={size} showTitle={true} />;
      })}

      {hiddenCount > 0 && (
        <button
          className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          onClick={() => {/* TODO: Open tag modal */}}
          title={`+${hiddenCount} tags adicionais`}
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
};

/**
 * Helper function to calculate contrasting text color
 * Returns white for dark backgrounds, dark for light backgrounds
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance using standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white text for dark backgrounds, dark for light
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default TagBadge;

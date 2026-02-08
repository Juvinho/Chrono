import React, { useState } from 'react';
import UserTagBadge from './UserTagBadge';
import { useTranslation } from '../../hooks/useTranslation';

interface UserTag {
  id: string;
  nome: string;
  icone: string;
  cor_hex: string;
  cor_border: string;
  categoria: 'positive' | 'moderation' | 'time' | 'style';
  descricao_publica: string;
  adquirida_em: string;
}

interface UserTagsProps {
  tags: UserTag[];
  maxVisible?: number;
  className?: string;
  showModal?: boolean;
  onOpenModal?: () => void;
}

const UserTags: React.FC<UserTagsProps> = ({
  tags,
  maxVisible = 3,
  className = '',
  showModal = true,
  onOpenModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;
  const hasMore = remainingCount > 0;

  const handleModalOpen = () => {
    setIsModalOpen(true);
    onOpenModal?.();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Tags Display */}
      <div className={`flex flex-wrap gap-2 items-center ${className}`}>
        {visibleTags.map((tag) => (
          <UserTagBadge key={tag.id} tag={tag} showTooltip={true} />
        ))}
      </div>

      {/* Modal with all tags */}
      {showModal && isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleModalClose}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('allTags')} ({tags.length})
              </h2>
              <button
                onClick={handleModalClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Tags Grid */}
            <div className="p-4">
              <div className="flex flex-col gap-2">
                {/* Organize tags by category */}
                {['positive', 'moderation', 'time', 'style'].map((categoria) => {
                  const categoryTags = tags.filter((t) => t.categoria === categoria);
                  
                  if (categoryTags.length === 0) return null;

                  const categoryLabel = {
                    positive: t('tagCategoryPositive'),
                    moderation: t('tagCategoryModeration'),
                    time: t('tagCategoryTime'),
                    style: t('tagCategoryStyle'),
                  }[categoria];

                  return (
                    <div key={categoria} className="mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {categoryLabel}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categoryTags.map((tag) => (
                          <UserTagBadge key={tag.id} tag={tag} showTooltip={true} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">{t('tagCategoryPositive')}:</span>
                    {' '}
                    {tags.filter((t) => t.categoria === 'positive').length}
                  </div>
                  <div>
                    <span className="font-medium">{t('tagCategoryModeration')}:</span>
                    {' '}
                    {tags.filter((t) => t.categoria === 'moderation').length}
                  </div>
                  <div>
                    <span className="font-medium">{t('tagCategoryTime')}:</span>
                    {' '}
                    {tags.filter((t) => t.categoria === 'time').length}
                  </div>
                  <div>
                    <span className="font-medium">{t('tagCategoryStyle')}:</span>
                    {' '}
                    {tags.filter((t) => t.categoria === 'style').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserTags;

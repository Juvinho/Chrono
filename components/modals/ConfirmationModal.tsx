
import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  showCancel = true,
  children
}) => {
    const { t } = useTranslation();
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content w-full max-w-lg">
                <h2 className="text-xl font-bold text-[var(--theme-text-light)] glitch-effect" data-text={title}>{title}</h2>
                <p className="text-[var(--theme-text-secondary)] mt-2">{message}</p>
                
                {children}

                <div className="flex justify-end space-x-4 mt-6">
                    {showCancel && (
                        <button onClick={onCancel} className="px-4 py-1 border border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-secondary)] hover:text-[var(--theme-text-light)]">
                            {cancelText || t('cancel')}
                        </button>
                    )}
                    <button onClick={onConfirm} className="px-4 py-1 bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-secondary)]">
                        {confirmText || t('confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;

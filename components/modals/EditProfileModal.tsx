import React, { useState } from 'react';
import { User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updates: User) => Promise<void>;
}

export default function EditProfileModal({ user, onClose, onSave }: EditProfileModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        birthday: user.birthday ? (typeof user.birthday === 'string' ? user.birthday.split('T')[0] : new Date(user.birthday).toISOString().split('T')[0]) : '',
        pronouns: user.pronouns || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic URL validation if provided
        let websiteToSave = formData.website.trim();
        if (websiteToSave && !websiteToSave.startsWith('http://') && !websiteToSave.startsWith('https://')) {
            websiteToSave = `https://${websiteToSave}`;
        }

        try {
            const updatedUser = {
                ...user,
                ...formData,
                website: websiteToSave,
                birthday: formData.birthday ? new Date(formData.birthday) : undefined
            };

            await onSave(updatedUser);
            onClose();
        } catch (err: any) {
            if (err.message?.includes('429')) {
                setError('Você está fazendo muitas requisições. Aguarde um momento antes de tentar novamente.');
            } else {
                setError(err.message || 'Failed to update profile');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg w-full max-w-md shadow-2xl animate-fade-in relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)]">
                    <h2 className="text-xl font-bold text-[var(--theme-text-light)] flex items-center">
                        <span className="mr-2 text-[var(--theme-primary)]">✎</span> {t('editProfile') || 'EDIT PROFILE'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                            {t('bio') || 'Bio'}
                        </label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            maxLength={500}
                            rows={4}
                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none resize-none"
                            placeholder={t('bioPlaceholder') || "Tell us about yourself..."}
                        />
                        <div className="text-right text-xs text-[var(--theme-text-secondary)] mt-1">
                            {formData.bio.length}/500
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                            {t('location') || 'Location'}
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            maxLength={50}
                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                            placeholder="City, Country"
                        />
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                            {t('website') || 'Website'}
                        </label>
                        <input
                            type="text"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            maxLength={100}
                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                            placeholder="example.com"
                        />
                    </div>

                    {/* Birthday */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                            {t('birthday') || 'Birthday'}
                        </label>
                        <input
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                        />
                    </div>

                     {/* Pronouns */}
                     <div>
                        <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                            {t('pronouns') || 'Pronouns'}
                        </label>
                        <input
                            type="text"
                            name="pronouns"
                            value={formData.pronouns}
                            onChange={handleChange}
                            maxLength={20}
                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                            placeholder="they/them"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--theme-border-primary)] mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)] transition-colors"
                            disabled={isLoading}
                        >
                            {t('cancel') || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    {t('saving') || 'Saving...'}
                                </>
                            ) : (
                                t('saveChanges') || 'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

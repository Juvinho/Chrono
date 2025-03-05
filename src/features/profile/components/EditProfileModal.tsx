import React, { useState } from 'react';
import { User } from '../../../types/index';
import { useTranslation } from '../../../hooks/useTranslation';
import { generateBio } from '../../../utils/geminiService';

interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updates: User) => Promise<void>;
}

export default function EditProfileModal({ user, onClose, onSave }: EditProfileModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'professional' | 'social'>('basic');

    const [formData, setFormData] = useState({
        bio: user.bio || '',
        headline: user.headline || '',
        location: user.location || '',
        website: user.website || '',
        birthday: user.birthday ? (typeof user.birthday === 'string' ? user.birthday.split('T')[0] : new Date(user.birthday).toISOString().split('T')[0]) : '',
        pronouns: user.pronouns || '',
        skills: user.skills ? user.skills.join(', ') : '',
        workExperience: user.workExperience || [],
        education: user.education || [],
        profileType: user.profileType || 'personal'
    });

    const handleGenerateBio = async () => {
        setIsGeneratingBio(true);
        setError(null);
        try {
            const newBio = await generateBio({
                ...user,
                ...formData
            });
            
            if (newBio) {
                setFormData(prev => ({ ...prev, bio: newBio }));
            } else {
                throw new Error(t('aiBioError') || 'Failed to generate bio');
            }
        } catch (err: any) {
            setError(err.message || 'Error generating bio');
        } finally {
            setIsGeneratingBio(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddWork = () => {
        setFormData(prev => ({
            ...prev,
            workExperience: [...prev.workExperience, { company: '', role: '', duration: '', description: '' }]
        }));
    };

    const handleUpdateWork = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newWork = [...prev.workExperience];
            newWork[index] = { ...newWork[index], [field]: value };
            return { ...prev, workExperience: newWork };
        });
    };

    const handleRemoveWork = (index: number) => {
        setFormData(prev => ({
            ...prev,
            workExperience: prev.workExperience.filter((_, i) => i !== index)
        }));
    };

    const handleAddEducation = () => {
        setFormData(prev => ({
            ...prev,
            education: [...prev.education, { school: '', degree: '', year: '' }]
        }));
    };

    const handleUpdateEducation = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newEdu = [...prev.education];
            newEdu[index] = { ...newEdu[index], [field]: value };
            return { ...prev, education: newEdu };
        });
    };

    const handleRemoveEducation = (index: number) => {
        setFormData(prev => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index)
        }));
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
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
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

                <div className="flex border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] px-4">
                    <button 
                        onClick={() => setActiveTab('basic')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'basic' ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]'}`}
                    >
                        {t('tabBasic') || 'BÁSICO'}
                    </button>
                    <button 
                        onClick={() => setActiveTab('professional')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'professional' ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]'}`}
                    >
                        {t('tabProfessional') || 'PROFISSIONAL'}
                    </button>
                    <button 
                        onClick={() => setActiveTab('social')}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'social' ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]'}`}
                    >
                        {t('tabSocial') || 'SOCIAL'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto chrono-scrollbar">
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {activeTab === 'basic' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Profile Type Selection */}
                            <div className="flex items-center justify-between p-3 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded">
                                <span className="text-sm font-bold text-[var(--theme-text-light)]">Modo de Perfil</span>
                                <select 
                                    value={formData.profileType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, profileType: e.target.value as 'personal' | 'professional' }))}
                                    className="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded px-2 py-1 text-xs text-[var(--theme-primary)]"
                                >
                                    <option value="personal">Pessoal</option>
                                    <option value="professional">Profissional</option>
                                </select>
                            </div>

                            {/* Bio Section */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-[var(--theme-text-secondary)]">
                                        {t('bio') || 'Bio'}
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={handleGenerateBio}
                                        disabled={isGeneratingBio}
                                        className="text-xs flex items-center gap-1 text-[var(--theme-primary)] hover:underline disabled:opacity-50"
                                    >
                                        {isGeneratingBio ? t('generatingBio') : (
                                            <>
                                                <span className="text-lg">✨</span> {t('generateWithAI')}
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    maxLength={160}
                                    rows={4}
                                    className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none resize-none"
                                    placeholder={t('bioPlaceholder') || "Tell us about yourself..."}
                                />
                                <div className="text-right text-xs text-[var(--theme-text-secondary)] mt-1">
                                    {formData.bio.length}/160
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                        className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)]"
                                        placeholder="they/them"
                                    />
                                </div>
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
                                        className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)]"
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Headline */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                                    {t('headline') || 'Headline Profissional'}
                                </label>
                                <input
                                    type="text"
                                    name="headline"
                                    value={formData.headline}
                                    onChange={handleChange}
                                    maxLength={100}
                                    className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                                    placeholder="Ex: Senior Neural Architect | Web3 Developer"
                                />
                            </div>

                            {/* Skills */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
                                    {t('skills') || 'Habilidades (separadas por vírgula)'}
                                </label>
                                <input
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleChange}
                                    className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] focus:outline-none"
                                    placeholder="React, TypeScript, Node.js..."
                                />
                            </div>

                            {/* Work Experience */}
                            <div className="space-y-4 pt-4 border-t border-[var(--theme-border-primary)]">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-[var(--theme-text-light)] uppercase tracking-widest">Experiência</h3>
                                    <button 
                                        type="button" 
                                        onClick={handleAddWork}
                                        className="text-[10px] bg-[var(--theme-primary)] text-white px-2 py-1 rounded hover:brightness-110 font-bold"
                                    >
                                        + ADICIONAR
                                    </button>
                                </div>
                                {formData.workExperience.map((exp, i) => (
                                    <div key={i} className="p-3 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded space-y-2 relative">
                                        <button type="button" onClick={() => handleRemoveWork(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">✕</button>
                                        <input type="text" placeholder="Empresa" value={exp.company} onChange={(e) => handleUpdateWork(i, 'company', e.target.value)} className="w-full bg-[var(--theme-bg-secondary)] border-none rounded p-1 text-xs text-[var(--theme-text-primary)]" />
                                        <input type="text" placeholder="Cargo" value={exp.role} onChange={(e) => handleUpdateWork(i, 'role', e.target.value)} className="w-full bg-[var(--theme-bg-secondary)] border-none rounded p-1 text-xs text-[var(--theme-text-primary)]" />
                                        <input type="text" placeholder="Duração" value={exp.duration} onChange={(e) => handleUpdateWork(i, 'duration', e.target.value)} className="w-full bg-[var(--theme-bg-secondary)] border-none rounded p-1 text-[10px] text-[var(--theme-text-secondary)]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div className="space-y-6 animate-fade-in">
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
                        </div>
                    )}

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

import { useBio } from '@/hooks/useBio';
import './profile-bio-sidebar.css';

interface ProfileBioSidebarProps {
  userId: string | null;
}

export function ProfileBioSidebar({ userId }: ProfileBioSidebarProps) {
  const { bioData, isLoading } = useBio(userId);

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <aside className="bio-sidebar">
        <div className="bio-loading">Carregando...</div>
      </aside>
    );
  }

  if (!bioData) {
    return null;
  }

  // Usa bio customizada se existir, senão usa auto-gerada
  const displayBio = bioData.customBio || bioData.autoBio;

  return (
    <aside className="bio-sidebar">
      {/* Header */}
      <div className="bio-header">
        <span className="bio-icon">📝</span>
        <h3>bio</h3>
      </div>

      {/* Conteúdo da Bio */}
      <div className="bio-content">
        <p>{displayBio}</p>
      </div>
    </aside>
  );
}

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

      {/* Tags do Sistema */}
      {bioData.tags.length > 0 && (
        <div className="bio-tags-section">
          <div className="tags-header">
            <span className="tags-label">: SYSTEM TAGS :</span>
          </div>

          <div className="tags-grid">
            {bioData.tags.map((tag) => (
              <div
                key={tag.key}
                className="bio-tag"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                }}
                title={tag.description}
              >
                {tag.icon && <span className="tag-icon">{tag.icon}</span>}
                <span className="tag-name">{tag.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

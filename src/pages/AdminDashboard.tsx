import { useState, useEffect } from 'react';
import { useAdminAuth } from '../contexts/AdminContext';
import { AdminUsers } from './AdminUsers';
import './admin-dashboard.css';

const LogOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const TagsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2H2v10h2m6-10v10"></path>
    <path d="M9 5h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"></path>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const BarChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10"></line>
    <line x1="18" y1="20" x2="18" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="16"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.98 2.98l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m2.98-2.98l4.24-4.24"></path>
  </svg>
);

interface Tag {
  id: number;
  name: string;
  post_count: number;
  created_at: string;
}

export function AdminDashboard() {
  const { admin, logout, token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch tags
  useEffect(() => {
    if (activeTab === 'tags') {
      fetchTags();
    }
  }, [activeTab]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/admin/tags', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar tags');
      }

      const data = await response.json();
      setTags(data.tags);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-avatar">
            {admin?.avatarUrl ? (
              <img src={admin.avatarUrl} alt={admin.username} />
            ) : (
              <span>{admin?.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="admin-info">
            <h3>{admin?.displayName || admin?.username}</h3>
            <p>Administrador</p>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChartIcon />
            <span>Dashboard</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            <TagsIcon />
            <span>Tags</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon />
            <span>Usuários</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon />
            <span>Configurações</span>
          </button>
        </nav>

        <button className="admin-logout-button" onClick={handleLogout}>
          <LogOutIcon />
          <span>Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-header">
          <h1>
            {activeTab === 'dashboard' && '📊 Dashboard'}
            {activeTab === 'tags' && '🏷️ Gerenciar Tags'}
            {activeTab === 'users' && '👥 Gerenciar Usuários'}
            {activeTab === 'settings' && '⚙️ Configurações'}
          </h1>
        </div>

        <div className="admin-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid">
              <div className="stat-card">
                <h3>Tags Totais</h3>
                <p className="stat-value">{tags.length}</p>
              </div>

              <div className="stat-card">
                <h3>Usuários</h3>
                <p className="stat-value">-</p>
                <p className="stat-note">Em breve</p>
              </div>

              <div className="stat-card">
                <h3>Posts</h3>
                <p className="stat-value">-</p>
                <p className="stat-note">Em breve</p>
              </div>

              <div className="stat-card">
                <h3>Mensagens</h3>
                <p className="stat-value">-</p>
                <p className="stat-note">Em breve</p>
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="tags-management">
              {error && <div className="error-message">{error}</div>}

              {isLoading ? (
                <div className="loading">Carregando tags...</div>
              ) : (
                <div className="tags-list">
                  <table className="tags-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Posts</th>
                        <th>Criada em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tags.map((tag) => (
                        <tr key={tag.id}>
                          <td>{tag.name}</td>
                          <td>{tag.post_count}</td>
                          <td>{new Date(tag.created_at).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <button className="action-btn edit">Editar</button>
                            <button className="action-btn delete">Deletar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {tags.length === 0 && (
                    <div className="empty-state">
                      <p>Nenhuma tag encontrada</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && <AdminUsers token={token} />}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="placeholder-content">
              <p>⚙️ Configurações em desenvolvimento...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

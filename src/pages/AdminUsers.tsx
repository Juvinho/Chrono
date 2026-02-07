import React, { useState, useEffect } from 'react';
import { adminUserService } from '../api/admin.service';
import { AdminUser } from '../types/admin';
import '../styles/admin-users.css';

interface AdminUsersProps {
  token: string;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ token }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<AdminUser>>({});
  const [newPassword, setNewPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBanned, setFilterBanned] = useState<boolean | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminUserService.getAllUsers(token);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFormData({
      display_name: user.display_name,
      email: user.email,
      bio: user.bio,
    });
    setShowEditModal(true);
  };

  const handleResetPasswordClick = (user: AdminUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleDeleteClick = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    try {
      await adminUserService.updateUser(selectedUser.id, editFormData, token);
      await fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      await adminUserService.resetPassword(selectedUser.id, newPassword, token);
      alert(`Senha resetada para: ${newPassword}\n\nCompartilhe com o usuário com segurança!`);
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await adminUserService.deleteUser(selectedUser.id, token);
      await fetchUsers();
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBanToggle = async (user: AdminUser) => {
    try {
      if (user.is_banned) {
        await adminUserService.unbanUser(user.id, token);
      } else {
        await adminUserService.banUser(user.id, token);
      }
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filtrar usuários
  let filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBanned = filterBanned === null || user.is_banned === filterBanned;
    
    return matchesSearch && matchesBanned;
  });

  if (loading) {
    return <div className="admin-users-container"><div className="loading">Carregando usuários...</div></div>;
  }

  return (
    <div className="admin-users-container">
      {error && <div className="error-message">❌ {error}</div>}

      <div className="users-header">
        <h2>👥 Gerenciamento de Usuários</h2>
        <p>Total: {users.length} usuários | Baneados: {users.filter(u => u.is_banned).length}</p>
      </div>

      <div className="users-controls">
        <input
          type="text"
          placeholder="🔍 Buscar por username, nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterBanned === null ? 'active' : ''}`}
            onClick={() => setFilterBanned(null)}
          >
            Todos
          </button>
          <button
            className={`filter-btn ${filterBanned === false ? 'active' : ''}`}
            onClick={() => setFilterBanned(false)}
          >
            ✅ Ativos
          </button>
          <button
            className={`filter-btn ${filterBanned === true ? 'active' : ''}`}
            onClick={() => setFilterBanned(true)}
          >
            🚫 Baneados
          </button>
          <button
            className="refresh-btn"
            onClick={fetchUsers}
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Nome Exibição</th>
              <th>Email</th>
              <th>Posts</th>
              <th>Seguidores</th>
              <th>Desde</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={user.is_banned ? 'banned-row' : ''}>
                <td className="username-cell">@{user.username}</td>
                <td>{user.display_name}</td>
                <td className="email-cell">{user.email}</td>
                <td className="centered">{user.post_count || 0}</td>
                <td className="centered">{user.followers_count || 0}</td>
                <td className="date-cell">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="status-cell">
                  {user.is_banned ? (
                    <span className="status-badge banned">🚫 Baneado</span>
                  ) : (
                    <span className="status-badge active">✅ Ativo</span>
                  )}
                </td>
                <td className="actions-cell">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEditClick(user)}
                    title="Editar usuário"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn ban-btn"
                    onClick={() => handleBanToggle(user)}
                    title={user.is_banned ? 'Desbanir' : 'Banir'}
                  >
                    {user.is_banned ? '🔓' : '🚫'}
                  </button>
                  <button
                    className="action-btn password-btn"
                    onClick={() => handleResetPasswordClick(user)}
                    title="Resetar senha"
                  >
                    🔐
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteClick(user)}
                    title="Deletar usuário"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-results">
          😕 Nenhum usuário encontrado
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Editar Usuário: {selectedUser.username}</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome de Exibição</label>
                <input
                  type="text"
                  value={editFormData.display_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  placeholder="Nome de exibição"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="Email"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  placeholder="Bio do usuário"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleEditSubmit}>Salvar Mudanças</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔐 Resetar Senha: {selectedUser.username}</h3>
              <button className="close-btn" onClick={() => setShowResetPasswordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Digite a nova senha para este usuário:</p>
              <div className="form-group">
                <label>Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                />
                <p className="hint">⚠️ Compartilhe a senha com o usuário com segurança</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowResetPasswordModal(false)}>Cancelar</button>
              <button 
                className="btn-save" 
                onClick={handleResetPassword}
                disabled={newPassword.length < 6}
              >
                Resetar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content warning" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Deletar Usuário</h3>
              <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja deletar o usuário <strong>@{selectedUser.username}</strong>?</p>
              <p className="warning-text">Esta ação é IRREVERSÍVEL e deletará todos os posts, mensagens e dados associados!</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="btn-delete" onClick={handleDelete}>Sim, Deletar Permanentemente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

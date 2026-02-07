import React, { useState, useEffect } from 'react';
import '../styles/admin-verification.css';

interface AdminVerificationProps {
  token: string;
}

interface VerifiedUser {
  id: string;
  username: string;
  display_name: string;
  is_verified: boolean;
  verification_badge_label?: string;
  verification_badge_color?: string;
}

export const AdminVerification: React.FC<AdminVerificationProps> = ({ token }) => {
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<VerifiedUser | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [badgeLabel, setBadgeLabel] = useState('Verificado');
  const [badgeColor, setBadgeColor] = useState('gold');

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:3001/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (user: VerifiedUser) => {
    setSelectedUser(user);
    setBadgeLabel(user.verification_badge_label || 'Verificado');
    setBadgeColor(user.verification_badge_color || 'gold');
    setShowVerifyModal(true);
  };

  const handleVerify = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/admin/verification/${selectedUser.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ badge_label: badgeLabel, badge_color: badgeColor }),
      });
      if (!response.ok) throw new Error('Erro ao verificar usuário');
      await fetchUsers();
      setShowVerifyModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnverify = async (userId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/admin/verification/${userId}/unverify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao desverificar');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  let filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const verifiedUsers = filteredUsers.filter(u => u.is_verified);
  const unverifiedUsers = filteredUsers.filter(u => !u.is_verified);

  if (loading) return <div className="verification-container"><div className="loading">Carregando...</div></div>;

  return (
    <div className="verification-container">
      {error && <div className="error-message">❌ {error}</div>}

      <div className="verification-header">
        <h2>✅ Gerenciamento de Verificação</h2>
        <p>Verificados: {verifiedUsers.length} | Não verificados: {unverifiedUsers.length}</p>
      </div>

      <div className="verification-search">
        <input
          type="text"
          placeholder="🔍 Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {verifiedUsers.length > 0 && (
        <div className="verification-section">
          <h3>✅ Usuários Verificados ({verifiedUsers.length})</h3>
          <div className="users-grid">
            {verifiedUsers.map(user => (
              <div key={user.id} className="user-card verified">
                <div className="user-info">
                  <strong>@{user.username}</strong>
                  <p>{user.display_name}</p>
                  {user.verification_badge_label && (
                    <span className="badge" style={{ backgroundColor: `var(--${user.badge_color})` }}>
                      {user.verification_badge_label}
                    </span>
                  )}
                </div>
                <button onClick={() => handleUnverify(user.id)} className="unverify-btn">
                  ❌ Desverificar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {unverifiedUsers.length > 0 && (
        <div className="verification-section">
          <h3>⭕ Não Verificados ({unverifiedUsers.length})</h3>
          <div className="users-grid">
            {unverifiedUsers.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <strong>@{user.username}</strong>
                  <p>{user.display_name}</p>
                </div>
                <button onClick={() => handleVerifyClick(user)} className="verify-btn">
                  ✅ Verificar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showVerifyModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Verificar: @{selectedUser.username}</h3>
            <div className="form-group">
              <label>Label do Badge</label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                placeholder="Ex: Verificado, Criador, Marca"
              />
            </div>
            <div className="form-group">
              <label>Cor do Badge</label>
              <select value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)}>
                <option value="gold">🟡 Gold</option>
                <option value="blue">🔵 Blue</option>
                <option value="green">🟢 Green</option>
                <option value="red">🔴 Red</option>
                <option value="silver">⚪ Silver</option>
              </select>
            </div>
            <div className="preview">
              <span className="badge-preview">{badgeLabel}</span>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowVerifyModal(false)}>Cancelar</button>
              <button onClick={handleVerify}>Verificar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

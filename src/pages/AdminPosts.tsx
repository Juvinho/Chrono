import React, { useState, useEffect } from 'react';
import { adminUserService } from '../api/admin.service';
import '../styles/admin-posts.css';

interface Post {
  id: string;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  reaction_count: number;
  reply_count: number;
}

interface AdminPostsProps {
  token: string;
}

export const AdminPosts: React.FC<AdminPostsProps> = ({ token }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://127.0.0.1:3001/api/admin/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao carregar posts');
      const data = await response.json();
      setPosts(data.posts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (post: Post) => {
    setSelectedPost(post);
    setEditContent(post.content);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedPost) return;
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/admin/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (!response.ok) throw new Error('Erro ao editar post');
      await fetchPosts();
      setShowEditModal(false);
      setSelectedPost(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (post: Post) => {
    setSelectedPost(post);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/admin/posts/${selectedPost.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao deletar post');
      await fetchPosts();
      setShowDeleteConfirm(false);
      setSelectedPost(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  let filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="admin-posts-container"><div className="loading">Carregando posts...</div></div>;

  return (
    <div className="admin-posts-container">
      {error && <div className="error-message">❌ {error}</div>}

      <div className="posts-header">
        <h2>📝 Gerenciamento de Posts</h2>
        <p>Total: {posts.length} posts</p>
      </div>

      <div className="posts-controls">
        <input
          type="text"
          placeholder="🔍 Buscar por conteúdo ou autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="refresh-btn" onClick={fetchPosts}>🔄 Atualizar</button>
      </div>

      <div className="posts-list">
        {filteredPosts.length === 0 ? (
          <div className="empty-state">Nenhum post encontrado</div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div>
                  <strong>@{post.username}</strong> <span className="text-muted">({post.display_name})</span>
                </div>
                <span className="post-date">{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="post-content">{post.content}</div>
              <div className="post-stats">
                <span>❤️ {post.reaction_count} reações</span>
                <span>💬 {post.reply_count} respostas</span>
              </div>
              <div className="post-actions">
                <button className="edit-btn" onClick={() => handleEditClick(post)}>✏️ Editar</button>
                <button className="delete-btn" onClick={() => handleDeleteClick(post)}>🗑️ Deletar</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showEditModal && selectedPost && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Post</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
            />
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button onClick={handleEditSubmit}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedPost && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content warning" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Deletar Post?</h3>
            <p>Esta ação não pode ser desfeita!</p>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button onClick={handleDelete}>Deletar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

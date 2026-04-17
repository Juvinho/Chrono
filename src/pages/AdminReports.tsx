import React, { useEffect, useMemo, useState } from 'react';
import { adminReportService, adminUserService } from '../api/admin.service';
import { API_BASE_URL } from '../api/client';
import { AdminReport, AdminReportStats, ReportStatus } from '../types/admin';
import '../styles/admin-reports.css';

interface AdminReportsProps {
  token: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: ReportStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Revisados', value: 'reviewed' },
  { label: 'Resolvidos', value: 'resolved' },
  { label: 'Descartados', value: 'dismissed' },
];

const statusLabelMap: Record<ReportStatus, string> = {
  pending: 'Pendente',
  reviewed: 'Revisado',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
};

const reasonLabelMap: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Assédio',
  hate_speech: 'Discurso de ódio',
  violence: 'Violência',
  nudity: 'Nudez',
  misinformation: 'Desinformação',
  impersonation: 'Impersonação',
  other: 'Outro',
};

export const AdminReports: React.FC<AdminReportsProps> = ({ token }) => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (selectedStatus: ReportStatus | 'all' = statusFilter) => {
    try {
      setLoading(true);
      setError(null);

      const [reportsData, statsData] = await Promise.all([
        adminReportService.getReports(token, selectedStatus),
        adminReportService.getStats(token),
      ]);

      setReports(reportsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const pendingCount = stats?.byStatus?.pending || 0;

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reports]);

  const updateReportStatus = async (reportId: string, nextStatus: ReportStatus) => {
    try {
      await adminReportService.updateStatus(reportId, nextStatus, token);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar status da denúncia');
    }
  };

  const handleBanReportedUser = async (report: AdminReport) => {
    if (!report.reported_user?.id) return;

    try {
      await adminUserService.banUser(report.reported_user.id, token);
      await adminReportService.updateStatus(report.id, 'resolved', token);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Falha ao banir usuário denunciado');
    }
  };

  const handleDeleteReportedPost = async (report: AdminReport) => {
    if (!report.reported_post?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/posts/${report.reported_post.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao deletar post denunciado');
      }

      await adminReportService.updateStatus(report.id, 'resolved', token);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Falha ao deletar post denunciado');
    }
  };

  return (
    <div className="admin-reports-container">
      {error && <div className="error-message">❌ {error}</div>}

      <div className="admin-reports-header">
        <div>
          <h2>🚩 Moderação de Denúncias</h2>
          <p>
            Pendentes: <strong>{pendingCount}</strong> • Total: <strong>{stats?.total || 0}</strong>
          </p>
        </div>
        <button className="refresh-btn" onClick={() => fetchData()}>
          🔄 Atualizar
        </button>
      </div>

      <div className="admin-reports-filters">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`filter-btn ${statusFilter === option.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Carregando denúncias...</div>
      ) : sortedReports.length === 0 ? (
        <div className="empty-state">Nenhuma denúncia encontrada neste filtro.</div>
      ) : (
        <div className="admin-reports-list">
          {sortedReports.map((report) => (
            <div key={report.id} className={`report-card status-${report.status}`}>
              <div className="report-card-header">
                <div className="report-main">
                  <span className={`report-status status-${report.status}`}>{statusLabelMap[report.status]}</span>
                  <span className="report-reason">{reasonLabelMap[report.reason] || report.reason}</span>
                </div>
                <span className="report-date">{new Date(report.created_at).toLocaleString('pt-BR')}</span>
              </div>

              <div className="report-meta">
                <p>
                  <strong>Denunciante:</strong> @{report.reporter.username}
                </p>
                {report.reported_user && (
                  <p>
                    <strong>Usuário denunciado:</strong> @{report.reported_user.username}{' '}
                    {report.reported_user.is_banned ? '(banido)' : ''}
                  </p>
                )}
                {report.reported_post && (
                  <p>
                    <strong>Post denunciado:</strong> por @{report.reported_post.author_username}
                  </p>
                )}
                {report.description && (
                  <p className="report-description">
                    <strong>Descrição:</strong> {report.description}
                  </p>
                )}
              </div>

              {report.reported_post?.content && (
                <div className="report-post-preview">{report.reported_post.content}</div>
              )}

              <div className="report-actions">
                <button
                  className="btn-action btn-review"
                  onClick={() => updateReportStatus(report.id, 'reviewed')}
                  disabled={report.status === 'reviewed'}
                >
                  Marcar revisado
                </button>

                <button
                  className="btn-action btn-resolve"
                  onClick={() => updateReportStatus(report.id, 'resolved')}
                  disabled={report.status === 'resolved'}
                >
                  Marcar resolvido
                </button>

                <button
                  className="btn-action btn-dismiss"
                  onClick={() => updateReportStatus(report.id, 'dismissed')}
                  disabled={report.status === 'dismissed'}
                >
                  Descartar
                </button>

                {report.reported_user && (
                  <button className="btn-action btn-ban" onClick={() => handleBanReportedUser(report)}>
                    Banir usuário
                  </button>
                )}

                {report.reported_post && (
                  <button className="btn-action btn-delete" onClick={() => handleDeleteReportedPost(report)}>
                    Deletar post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import MessagesPage from '../components/MessagesPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../../../components/ui/Header', () => ({
  default: ({ user }: any) => <div data-testid="header">@{user.username}</div>,
}));

const mockSubscribe = vi.fn(() => ({ close: vi.fn() }));

vi.mock('../../../api', () => ({
  apiClient: {
    getConversations: vi.fn().mockResolvedValue({ data: [] }),
    getOrCreateConversation: vi.fn().mockResolvedValue({ data: { id: 'convA' } }),
    getMessages: vi.fn().mockResolvedValue({ data: [{ id: 'm1', sender_id: 'other', text: 'Olá', created_at: new Date().toISOString() }] }),
    getUserStatus: vi.fn().mockResolvedValue({ data: { username: 'other', online: true, lastSeen: new Date().toISOString() } }),
    subscribeConversation: vi.fn((id: string, handlers: any) => {
      mockSubscribe(id, handlers);
      return { close: vi.fn() } as any;
    }),
  }
}));

describe('MessagesPage new conversation context', () => {
  const props = {
    currentUser: { id: 'me', username: 'me' } as any,
    onLogout: vi.fn(),
    onNavigate: vi.fn(),
    onNotificationClick: vi.fn(),
    onViewNotifications: vi.fn(),
    allUsers: [],
    conversations: [],
    lastViewedNotifications: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre conversa existente ou cria e carrega histórico inicial', async () => {
    render(
      <MemoryRouter initialEntries={['/messages/other']}>
        <Routes>
          <Route path="/messages/:username" element={<MessagesPage {...props} />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Olá')).toBeInTheDocument();
    });
  });
});

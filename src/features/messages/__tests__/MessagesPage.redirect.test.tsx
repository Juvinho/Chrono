import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MessagesPage from '../components/MessagesPage';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../../../components/ui/Header', () => ({
  default: ({ user }: any) => <div data-testid="header">@{user.username}</div>,
}));

vi.mock('../../../api', () => ({
  apiClient: {
    getConversations: vi.fn().mockResolvedValue({ data: [{ id: 'conv1', updated_at: new Date().toISOString(), other_username: 'other' }] }),
    getMessages: vi.fn().mockResolvedValue({ data: [{ id: 'm1', sender_id: 'other', text: 'hi', created_at: new Date().toISOString() }] }),
    getOrCreateConversation: vi.fn().mockResolvedValue({ data: { id: 'conv1' } }),
  }
}));

describe('MessagesPage redirect behavior', () => {
  const mockOnNavigate = vi.fn();
  const props = {
    currentUser: { id: 'me', username: 'me' } as any,
    onLogout: vi.fn(),
    onNavigate: mockOnNavigate,
    onNotificationClick: vi.fn(),
    onViewNotifications: vi.fn(),
    allUsers: [],
    conversations: [],
    lastViewedNotifications: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('does NOT redirect to Dashboard when opening a conversation', async () => {
    render(<MessagesPage {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
    // Click inbox item
    const inboxButton = await screen.findByRole('button', { name: /@other/i });
    fireEvent.click(inboxButton);
    await waitFor(() => {
      expect(mockOnNavigate).not.toHaveBeenCalledWith(1); // Page.Dashboard == 1 typically
    });
    expect(sessionStorage.getItem('chrono_open_conversation_id')).toBeNull();
  });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ChatDrawer from '../features/messages/components/ChatDrawer';
import { LanguageProvider } from '../hooks/useTranslation';
import { ToastProvider } from '../contexts/ToastContext';
import * as apiModule from '../api';

describe('ChatDrawer optimistic update', () => {
  it('calls onMessageSent after successful API send', async () => {
    (window.HTMLElement as any).prototype.scrollIntoView = vi.fn();
    const currentUser = { id: 'u1', username: 'me', avatar: '', bio: '' } as any;
    const otherUser = { id: 'u2', username: 'you', avatar: '', bio: '' } as any;
    const conversation = {
      id: 'c1',
      participants: ['me', 'you'],
      messages: [],
      lastMessageTimestamp: new Date(),
      unreadCount: {},
    } as any;
    const onMessageSent = vi.fn();

    vi.spyOn(apiModule, 'apiClient', 'get').mockReturnValue({
      sendMessageToUser: vi.fn().mockResolvedValue({
        data: {
          id: 'm1',
          text: 'hello',
          createdAt: new Date().toISOString(),
          senderUsername: 'me',
        },
      }),
      markConversationAsRead: vi.fn().mockResolvedValue({ data: { success: true } }),
    } as any);

    render(
      <LanguageProvider>
        <ToastProvider>
          <ChatDrawer
            isOpen={true}
            onClose={() => {}}
            currentUser={currentUser}
            conversations={[conversation]}
            activeChatUser={otherUser}
            onSetActiveChatUser={() => {}}
            allUsers={[currentUser, otherUser]}
            onMessageSent={onMessageSent}
          />
        </ToastProvider>
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('Digite uma mensagem...');
    fireEvent.change(input, { target: { value: 'hello' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    await new Promise(r => setTimeout(r, 30));

    expect(onMessageSent).toHaveBeenCalledTimes(2);
    const firstCall = onMessageSent.mock.calls[0];
    const secondCall = onMessageSent.mock.calls[1];
    expect(firstCall[0]).toBe('c1');
    expect(firstCall[1].status).toBe('sending');
    expect(secondCall[0]).toBe('c1');
    expect(secondCall[1].status).toBe('sent');
  });
});

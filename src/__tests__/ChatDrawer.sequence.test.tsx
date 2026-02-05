import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ChatDrawer from '../features/messages/components/ChatDrawer';
import { LanguageProvider } from '../hooks/useTranslation';
import { ToastProvider } from '../contexts/ToastContext';

describe('ChatDrawer envio: sequência única', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window.HTMLElement as any).prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('executa sending -> arrow -> sent apenas uma vez e horário após sent', async () => {
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
    fireEvent.change(input, { target: { value: 'olá' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(onMessageSent).toHaveBeenCalledTimes(1);
    expect(onMessageSent.mock.calls[0][1].messageStatus).toBe('sending');

    vi.advanceTimersByTime(800);
    expect(onMessageSent).toHaveBeenCalledTimes(2);
    expect(onMessageSent.mock.calls[1][1].messageStatus).toBe('arrow');

    vi.advanceTimersByTime(200);
    expect(onMessageSent).toHaveBeenCalledTimes(3);
    const finalCall = onMessageSent.mock.calls[2][1];
    expect(finalCall.messageStatus).toBe('sent');
    expect(finalCall.createdAt).toBeInstanceOf(Date);
  });

  it('mensagens antigas não re-disparam animação', () => {
    const currentUser = { id: 'u1', username: 'me', avatar: '', bio: '' } as any;
    const otherUser = { id: 'u2', username: 'you', avatar: '', bio: '' } as any;
    const conversation = {
      id: 'c1',
      participants: ['me', 'you'],
      messages: [{
        id: 'm-old',
        conversationId: 'c1',
        senderId: 'u1',
        text: 'antiga',
        status: 'sent',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      }],
      lastMessageTimestamp: new Date(),
      unreadCount: {},
    } as any;
    const onMessageSent = vi.fn();

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

    // Sem envio, sem animação disparada
    expect(onMessageSent).toHaveBeenCalledTimes(0);
  });
});

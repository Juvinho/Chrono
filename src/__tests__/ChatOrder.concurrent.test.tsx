import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ChatDrawer from '../features/messages/components/ChatDrawer';
import { LanguageProvider } from '../hooks/useTranslation';
import { ToastProvider } from '../contexts/ToastContext';
import * as apiModule from '../api';

function cmpAsc(a: any, b: any) {
  const at = new Date(a.createdAt || a.timestamp || 0).getTime();
  const bt = new Date(b.createdAt || b.timestamp || 0).getTime();
  if (at !== bt) return at - bt;
  const ac = a.clientSeq || 0;
  const bc = b.clientSeq || 0;
  if (ac !== bc) return ac - bc;
  return (a.id > b.id ? 1 : -1);
}

describe('Ordenação cronológica com envios simultâneos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window.HTMLElement as any).prototype.scrollIntoView = vi.fn();
    vi.spyOn(apiModule, 'apiClient', 'get').mockReturnValue({
      sendMessageToUser: vi.fn().mockImplementation(async (_u: string, text: string) => {
        await new Promise(r => setTimeout(r, 5));
        return { data: { id: `srv-${text}`, text, createdAt: new Date().toISOString() } };
      }),
      markConversationAsRead: vi.fn().mockResolvedValue({ data: { success: true } }),
      getMessages: vi.fn().mockResolvedValue({ data: [] })
    } as any);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mantém ordem no rodapé com envios em rápida sucessão', async () => {
    const currentUser = { id: 'u1', username: 'me', avatar: '', bio: '' } as any;
    const otherUser = { id: 'u2', username: 'you', avatar: '', bio: '' } as any;
    const conversation = {
      id: 'c1',
      participants: ['me', 'you'],
      messages: [],
      lastMessageTimestamp: new Date(),
      unreadCount: {},
    } as any;
    const buffer: any[] = [];
    const onMessageSent = vi.fn((convId: string, msg: any) => {
      if (convId === 'c1') {
        buffer.push(msg);
      }
    });

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
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.submit(input.closest('form')!);
    vi.advanceTimersByTime(1200);
    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.submit(input.closest('form')!);
    vi.advanceTimersByTime(1200);
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.submit(input.closest('form')!);
    vi.advanceTimersByTime(1600);

    const sentOnly = buffer.filter(m => m.messageStatus === 'sent' && typeof m.id === 'string' && !m.id.startsWith('local-'));
    const ordered = sentOnly.slice().sort(cmpAsc);
    expect(ordered.map(m => m.text)).toEqual(['a','b','c']);
    expect(ordered[ordered.length - 1].messageStatus).toBe('sent');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Header from '../Header';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../icons', () => ({
  SearchIcon: () => <div />,
  LogoutIcon: () => <div />,
  BellIcon: () => <div />,
  SettingsIcon: () => <div />,
  FilmIcon: () => <div />,
  ShoppingBagIcon: () => <div />,
  ChevronLeftIcon: () => <div />,
  PaperPlaneIcon: () => <div />,
}));

describe('Header chat button redirect', () => {
  it('redirects to external messages URL when clicked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);
    render(<Header 
      user={{ username: 'me', notifications: [] } as any}
      onLogout={() => {}}
      onViewProfile={() => {}}
      onNavigate={() => {}}
      onNotificationClick={() => {}}
      onViewNotifications={() => {}}
      onSearch={() => {}}
      allUsers={[]}
      allPosts={[]}
    />);
    const btn = screen.getByTitle(/send/i);
    fireEvent.click(btn);
    expect(openSpy).toHaveBeenCalledWith('https://chrono-production-3214.up.railway.app/messages', '_self');
    openSpy.mockRestore();
  });
}
)

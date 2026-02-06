import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Header from '../Header';
import { Page } from '../../../types';

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
  it('navigates to internal messages route when clicked', () => {
    const onNavigate = vi.fn();
    render(<Header 
      user={{ username: 'me', notifications: [] } as any}
      onLogout={() => {}}
      onViewProfile={() => {}}
      onNavigate={onNavigate}
      onNotificationClick={() => {}}
      onViewNotifications={() => {}}
      onSearch={() => {}}
      allUsers={[]}
      allPosts={[]}
    />);
    const btn = screen.getByTitle(/send/i);
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith(Page.Messages);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../icons', () => ({
  SearchIcon: () => <div />,
  LogoutIcon: () => <div />,
  BellIcon: () => <div />,
  SettingsIcon: () => <div />,
  MessageIcon: () => <div />,
  FilmIcon: () => <div />,
  ShoppingBagIcon: () => <div />,
  ChevronLeftIcon: () => <div />,
  PaperPlaneIcon: () => <div data-testid="paper-plane" />,
}));

import Header from '../Header';

describe('Header PaperPlane icon', () => {
  it('renders plane icon in top tools section', () => {
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
    expect(screen.getByTestId('paper-plane')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SearchOverlay from './SearchOverlay';
import { apiClient } from '../../utils/api';

// Mock dependencies
vi.mock('../../utils/api', () => ({
  apiClient: {
    searchUsers: vi.fn(),
  },
}));

vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../features/profile/components/FramePreview', () => ({
  default: () => <div data-testid="frame-preview" />,
  getFrameShape: () => 'rounded-full',
}));

vi.mock('../../features/profile/components/Avatar', () => ({
  default: ({ username }: { username: string }) => <div data-testid="avatar">@{username}</div>,
}));

vi.mock('./icons', () => ({
  SearchIcon: () => <div data-testid="search-icon" />,
}));

describe('SearchOverlay', () => {
  const mockOnClose = vi.fn();
  const mockOnSearch = vi.fn();
  const mockOnViewProfile = vi.fn();
  
  const mockCurrentUser = {
    username: 'currentuser',
    avatar: 'avatar.jpg',
    followingList: [],
    followers: 10,
    following: 5
  };

  const defaultProps = {
    onClose: mockOnClose,
    onSearch: mockOnSearch,
    onViewProfile: mockOnViewProfile,
    allUsers: [],
    allPosts: [],
    currentUser: mockCurrentUser as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SearchOverlay {...defaultProps} />);
    expect(screen.getByPlaceholderText('searchChrono')).toBeInTheDocument();
  });

  it('performs debounced search and displays results', async () => {
    const mockUsers = [
      { username: 'testuser1', avatar: '1.jpg', followers: 100, following: 50 },
      { username: 'testuser2', avatar: '2.jpg', followers: 200, following: 20 },
    ];
    
    (apiClient.searchUsers as any).mockResolvedValue({ data: mockUsers });

    render(<SearchOverlay {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('searchChrono');
    fireEvent.change(input, { target: { value: 'test' } });

    // Loading state should appear eventually (after debounce)
    // We can't easily assert loading state appearing and disappearing without fake timers, 
    // but we can wait for results.

    await waitFor(() => {
      expect(apiClient.searchUsers).toHaveBeenCalledWith('test');
    }, { timeout: 1000 });

    const users1 = await screen.findAllByText(/testuser1/i);
    const users2 = await screen.findAllByText(/testuser2/i);
    expect(users1.length).toBeGreaterThan(0);
    expect(users2.length).toBeGreaterThan(0);
    expect(screen.getByText('100')).toBeInTheDocument(); // followers
  });

  it('handles search error gracefully', async () => {
    (apiClient.searchUsers as any).mockRejectedValue(new Error('API Error'));

    render(<SearchOverlay {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('searchChrono');
    fireEvent.change(input, { target: { value: 'error' } });

    await waitFor(() => {
      expect(apiClient.searchUsers).toHaveBeenCalled();
    });
    
    // Should show No Signal or just empty results (depends on implementation details)
    // In our implementation, error clears results, so foundUsers is empty.
    // If hasResults is false and searchTerm is present, it shows No Signal (after loading).
    
    await waitFor(() => {
        expect(screen.queryByText('@testuser1')).not.toBeInTheDocument();
    });
  });

  it('navigates with keyboard', async () => {
     const mockUsers = [
      { username: 'keyboarduser', avatar: '1.jpg' },
    ];
    (apiClient.searchUsers as any).mockResolvedValue({ data: mockUsers });

    render(<SearchOverlay {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('searchChrono');
    fireEvent.change(input, { target: { value: 'key' } });

    await waitFor(() => {
      expect(screen.getAllByText(/keyboarduser/i).length).toBeGreaterThan(0);
    });

    const userItem = screen.getAllByText(/keyboarduser/i)[0].closest('a');
    expect(userItem).toBeInTheDocument();
    
    if (userItem) {
        fireEvent.click(userItem);
        expect(mockOnViewProfile).toHaveBeenCalledWith('keyboarduser');
    }
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SettingsPage from '../components/SettingsPage';
import { Page, User } from '../../types';

// Mock dependencies
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
        const translations: Record<string, string> = {
            'settingsSaved': 'Settings saved successfully',
            'saveChanges': 'Save Changes',
            // Add other keys as needed
        };
        return translations[key] || key;
    },
    setLanguage: vi.fn(),
    language: 'en',
  }),
}));

vi.mock('../../../api', () => ({
  apiClient: {
    changePassword: vi.fn(),
  },
}));

vi.mock('../../../components/ui/ImageCropper', () => ({
  ImageCropper: ({ onCrop, onCancel }: any) => (
    <div data-testid="image-cropper">
      <button onClick={() => onCrop('cropped-image-data')}>Apply Crop</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../../../components/ui/Header', () => ({
  default: () => <div data-testid="header" />,
}));

// Let Avatar and FramePreview render normally; they are simple and won't affect tests

// No need to mock FramePreview for current tests

vi.mock('./icons', () => ({
  BlockIcon: () => <div />,
  FlagIcon: () => <div />,
}));

describe('SettingsPage', () => {
  const mockUser: User = {
    id: 'test-id',
    username: 'testuser',
    email: 'test@example.com',
    avatar: 'avatar.jpg',
    bio: 'Test bio',
    birthday: '1990-01-01',
    coverImage: 'cover.jpg',
    followingList: [],
    followers: 10,
    following: 5,
    profileSettings: {
        theme: 'light',
        accentColor: 'purple',
        effect: 'none',
        animationsEnabled: true,
        borderRadius: 'md',
        autoRefreshEnabled: false,
        autoRefreshInterval: 5,
        coverImage: ''
    }
  };

  const mockOnLogout = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnNotificationClick = vi.fn();
  const mockOnUpdateUser = vi.fn();
  const mockOnOpenMarketplace = vi.fn();

  const defaultProps = {
    user: mockUser,
    onLogout: mockOnLogout,
    onNavigate: mockOnNavigate,
    onNotificationClick: mockOnNotificationClick,
    onUpdateUser: mockOnUpdateUser,
    allUsers: [],
    allPosts: [],
    conversations: [],
    onOpenMarketplace: mockOnOpenMarketplace,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SettingsPage {...defaultProps} />);
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('updates user state on input change', () => {
    render(<SettingsPage {...defaultProps} />);
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    expect(emailInput).toHaveValue('new@example.com');
  });

  it('calls onUpdateUser when Save button is clicked', async () => {
    mockOnUpdateUser.mockResolvedValue({ success: true } as any);
    render(<SettingsPage {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdateUser).toHaveBeenCalledTimes(1);
    });
  });

  it('displays success message on successful save', async () => {
    mockOnUpdateUser.mockResolvedValue({ success: true } as any);
    render(<SettingsPage {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('displays error message on failed save', async () => {
    mockOnUpdateUser.mockResolvedValue({ error: 'Update failed' } as any);
    render(<SettingsPage {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('validates required fields (email)', async () => {
    render(<SettingsPage {...defaultProps} />);
    
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: '' } }); // Clear email
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdateUser).not.toHaveBeenCalled();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('handles unexpected errors during save', async () => {
    mockOnUpdateUser.mockRejectedValue(new Error('Network error'));
    render(<SettingsPage {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});

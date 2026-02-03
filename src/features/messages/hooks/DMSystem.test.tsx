
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessagesPage from '../MessagesPage';
import { Page, User, Conversation } from '../../types';

// Mock translation hook
vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock icons
vi.mock('../icons', () => ({
  MessageIcon: () => <div data-testid="message-icon" />,
  EditIcon: () => <div data-testid="edit-icon" />,
  LockClosedIcon: () => <div data-testid="lock-icon" />,
  UploadIcon: () => <div data-testid="upload-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
}));

// Mock Header
vi.mock('../Header', () => ({
  default: () => <div data-testid="header" />,
}));

// Mock Avatar
vi.mock('../Avatar', () => ({
  default: ({ username }: { username: string }) => <div data-testid="avatar">{username}</div>,
}));

describe('MessagesPage', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@test.com',
    avatar: '',
    bio: '',
    birthday: '',
    coverImage: '',
    followers: 0,
    following: 0,
    profileSettings: { theme: 'dark', accentColor: 'purple', effect: 'none' },
  };

  const mockOtherUser: User = {
    id: '2',
    username: 'otheruser',
    avatar: '',
    bio: 'Other user bio',
    followers: 10,
    following: 5,
    birthday: '',
    coverImage: '',
  };

  const mockConversations: Conversation[] = [
    {
      id: 'conv1',
      participants: ['testuser', 'otheruser'],
      messages: [
        {
          id: 'msg1',
          senderUsername: 'otheruser',
          text: 'Hello there!',
          timestamp: new Date(),
          status: 'read',
        },
      ],
      lastMessageTimestamp: new Date(),
      unreadCount: { testuser: 0, otheruser: 0 },
    },
  ];

  const mockProps = {
    currentUser: mockUser,
    onLogout: vi.fn(),
    onNavigate: vi.fn(),
    onNotificationClick: vi.fn(),
    allUsers: [mockUser, mockOtherUser],
    allPosts: [],
    conversations: mockConversations,
    onSendMessage: vi.fn(),
    onSendGlitchi: vi.fn(),
    onMarkConversationAsRead: vi.fn(),
    onCreateOrFindConversation: vi.fn(),
  };

  it('renders conversation list correctly', () => {
    render(<MessagesPage {...mockProps} />);
    expect(screen.getByText('@otheruser')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('selects a conversation and shows messages', async () => {
    render(<MessagesPage {...mockProps} />);
    
    const convButton = screen.getAllByText('@otheruser')[0].closest('button');
    fireEvent.click(convButton!);

    await waitFor(() => {
      expect(screen.getAllByText('Hello there!').length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('typeYourMessage')).toBeInTheDocument();
    });
  });

  it('calls onSendMessage when sending a message', async () => {
    render(<MessagesPage {...mockProps} />);
    
    const convButton = screen.getAllByText('@otheruser')[0].closest('button');
    fireEvent.click(convButton!);

    const input = screen.getByPlaceholderText('typeYourMessage');
    fireEvent.change(input, { target: { value: 'Hi back!' } });
    
    const sendButton = screen.getByText('send');
    fireEvent.click(sendButton);

    expect(mockProps.onSendMessage).toHaveBeenCalledWith('otheruser', 'Hi back!', undefined);
  });

  it('displays unread badge correctly', () => {
    const unreadConv = [
      {
        ...mockConversations[0],
        unreadCount: { testuser: 5 },
      },
    ];
    render(<MessagesPage {...mockProps} conversations={unreadConv} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

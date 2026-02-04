import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import Avatar from '../../profile/components/Avatar';
import { CloseIcon, MessageIcon, SendIcon, ChevronLeftIcon } from '../../../components/ui/icons';
import { apiClient } from '../../../api';

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    conversations: Conversation[];
    activeChatUser: User | null; // If present, shows chat view
    onSetActiveChatUser: (user: User | null) => void;
    allUsers: User[]; // To find user details for conversations
}

export default function ChatDrawer({
    isOpen,
    onClose,
    currentUser,
    conversations,
    activeChatUser,
    onSetActiveChatUser,
    allUsers
}: ChatDrawerProps) {
    const { t } = useTranslation();
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Effect to handle view switching based on activeChatUser
    useEffect(() => {
        if (activeChatUser) {
            scrollToBottom();
            // Focus input when chat opens
            setTimeout(() => inputRef.current?.focus(), 100);
            
            // Join real-time room via socket
            const conversation = conversations.find(c => c.participants.includes(activeChatUser.username));
            if (conversation) {
                // Assuming socketService is available globally or imported
                // We'll need to import socketService from utils
                import('../../../utils/socketService').then(({ socketService }) => {
                    socketService.emit('join_conversation', conversation.id);
                });
            }
        }
    }, [activeChatUser, conversations]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Helper to get conversation partner
    const getPartner = (conversation: Conversation) => {
        const partnerUsername = conversation.participants.find(p => p !== currentUser.username);
        return allUsers.find(u => u.username === partnerUsername) || { 
            username: partnerUsername || 'Unknown', 
            avatar: '', 
            id: partnerUsername || 'unknown' 
        } as User;
    };

    // Get active conversation
    const currentConversation = activeChatUser 
        ? conversations.find(c => c.participants.includes(activeChatUser.username)) 
        : null;

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageText.trim() || !activeChatUser) return;

        const textToSend = messageText;
        setMessageText(''); // Optimistic clear

        try {
            await apiClient.sendMessage(activeChatUser.username, textToSend);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            // Ideally show toast here
        }
    };

    const handleConversationClick = (conversation: Conversation) => {
        const partner = getPartner(conversation);
        onSetActiveChatUser(partner);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#1a1a1a] border-l border-[var(--theme-border-primary)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* View: Conversation List */}
                {!activeChatUser ? (
                    <div className="flex flex-col h-full animate-fade-in">
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--theme-border-primary)] flex justify-between items-center bg-[var(--theme-bg-secondary)]">
                            <h2 className="text-xl font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
                                <MessageIcon className="w-5 h-5" />
                                Directs
                            </h2>
                            <button onClick={onClose} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {conversations.length > 0 ? (
                                conversations.sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()).map(conv => {
                                    const partner = getPartner(conv);
                                    const lastMsg = conv.messages[conv.messages.length - 1];
                                    const unreadCount = conv.unreadCount?.[currentUser.username] || 0;
                                    const isUnread = unreadCount > 0;

                                    return (
                                        <div 
                                            key={conv.id}
                                            onClick={() => handleConversationClick(conv)}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors group"
                                        >
                                            <div className="relative">
                                                <Avatar src={partner.avatar} username={partner.username} className="w-12 h-12 rounded-full" />
                                                {isUnread && (
                                                    <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-[var(--theme-primary)] rounded-full border-2 border-[#1a1a1a]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`font-bold truncate ${isUnread ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}>
                                                        {partner.username}
                                                    </span>
                                                    <span className="text-xs text-[var(--theme-text-secondary)] whitespace-nowrap ml-2">
                                                        {new Date(lastMsg?.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate ${isUnread ? 'text-white font-semibold' : 'text-gray-500'}`}>
                                                    {lastMsg?.senderUsername === currentUser.username && 'You: '}
                                                    {lastMsg?.text || 'Sent an attachment'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-secondary)] opacity-50 gap-4">
                                    <MessageIcon className="w-16 h-16" />
                                    <p>Sua caixa de entrada está vazia</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* View: Active Chat */
                    <div className="flex flex-col h-full animate-slide-in-right">
                        {/* Header */}
                        <div className="p-3 border-b border-[var(--theme-border-primary)] flex items-center gap-3 bg-[var(--theme-bg-secondary)] shadow-sm">
                            <button 
                                onClick={() => onSetActiveChatUser(null)}
                                className="p-1 hover:bg-[var(--theme-bg-tertiary)] rounded-full text-[var(--theme-text-secondary)]"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            
                            <div className="flex items-center gap-3 flex-1">
                                <Avatar src={activeChatUser.avatar} username={activeChatUser.username} className="w-8 h-8 rounded-full" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-[var(--theme-text-primary)]">{activeChatUser.username}</span>
                                    <span className="text-[10px] text-[var(--theme-primary)] flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                        Online agora
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#121212]">
                            {currentConversation?.messages.map((msg, idx) => {
                                const isMe = msg.senderUsername === currentUser.username;
                                const isLast = idx === currentConversation.messages.length - 1;
                                
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div 
                                            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm break-words relative group ${
                                                isMe 
                                                    ? 'bg-[var(--theme-primary)] text-white rounded-br-none' 
                                                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                                            }`}
                                        >
                                            {msg.text}
                                            <span className="text-[10px] opacity-50 block text-right mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border-primary)]">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Mensagem..."
                                    className="flex-1 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-4 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] border border-transparent placeholder-gray-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!messageText.trim()}
                                    className="p-2 bg-[var(--theme-primary)] text-white rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

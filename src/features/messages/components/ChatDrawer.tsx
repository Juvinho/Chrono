import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Conversation, Message } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import Avatar from '../../profile/components/Avatar';
import { CloseIcon, MessageIcon, SendIcon, ChevronLeftIcon, SearchIcon, PlusIcon, PaperPlaneIcon } from '../../../components/ui/icons';
import { apiClient } from '../../../api';
import { socketService } from '../../../utils/socketService';

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    conversations: Conversation[];
    activeChatUser: User | null; // If present, shows chat view
    onSetActiveChatUser: (user: User | null) => void;
    allUsers: User[]; // To find user details for conversations
    onMessageSent?: (conversationId: string, message: Message) => void;
    onAppendMessages?: (conversationId: string, messages: Message[]) => void;
}

export default function ChatDrawer({
    isOpen,
    onClose,
    currentUser,
    conversations,
    activeChatUser,
    onSetActiveChatUser,
    allUsers,
    onMessageSent,
    onAppendMessages
}: ChatDrawerProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const sendSeqRef = useRef<Record<string, number>>({});
    const sendQueueRef = useRef<Record<string, string[]>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Effect to handle view switching based on activeChatUser
    useEffect(() => {
        if (activeChatUser) {
            scrollToBottom();
            // Focus input when chat opens
            setTimeout(() => inputRef.current?.focus(), 100);
            
            // Join real-time room via socket and mark as read
            const conversation = conversations.find(c => c.participants.includes(activeChatUser.username));
            if (conversation) {
                // Mark conversation as read when opening
                apiClient.markConversationAsRead(conversation.id).catch(err => {
                    console.error('Failed to mark conversation as read:', err);
                });
                
                // Join socket room
                    socketService.emit('join_conversation', conversation.id);
            }
        } else {
            // Focus search when back to list
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [activeChatUser, conversations]);

    // Typing indicator via Socket.io
    useEffect(() => {
        if (!activeChatUser) return;

        const conversation = conversations.find(c => c.participants.includes(activeChatUser.username));
        if (!conversation) return;

        const handleTyping = (data: any) => {
            if (data.username === activeChatUser.username) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        };

        const handleStopTyping = (data: any) => {
            if (data.username === activeChatUser.username) {
                setIsTyping(false);
            }
        };

        socketService.on('display_typing', handleTyping);
        socketService.on('hide_typing', handleStopTyping);

        return () => {
            socketService.off('display_typing', handleTyping);
            socketService.off('hide_typing', handleStopTyping);
        };
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

    // Get active conversation (definido antes dos useEffects que o usam)
    const currentConversation = activeChatUser 
        ? conversations.find(c => c.participants.includes(activeChatUser.username)) 
        : null;

    // Effect to scroll to bottom when messages change
    useEffect(() => {
        if (isLoadingOlder) return;
        if (currentConversation?.messages && currentConversation.messages.length > 0) {
            scrollToBottom();
        }
    }, [currentConversation?.messages?.length, isLoadingOlder]);

    // Handle typing indicator
    const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageText(e.target.value);
        
        if (!activeChatUser) return;
        
        const conversation = conversations.find(c => c.participants.includes(activeChatUser.username));
        if (!conversation) return;

        // Emit typing event
        socketService.emit('typing', { 
            room: `conversation:${conversation.id}`, 
            username: currentUser.username
        });

        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set timeout to stop typing after 2 seconds
        const timeout = setTimeout(() => {
            socketService.emit('stop_typing', { 
                room: `conversation:${conversation.id}`, 
                username: currentUser.username
            });
        }, 2000);

        setTypingTimeout(timeout);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!activeChatUser) return;
        const textToSend = messageText.trim();
        if (!textToSend) return;
        if (isLoading) {
            const convId = conversations.find(c => c.participants.includes(activeChatUser.username))?.id;
            if (convId) {
                const q = sendQueueRef.current[convId] || [];
                q.push(textToSend);
                sendQueueRef.current[convId] = q;
            }
            return;
        }
        setMessageText('');
        setIsLoading(true);

        // Stop typing indicator
        const conversation = conversations.find(c => c.participants.includes(activeChatUser.username));
        if (conversation) {
            socketService.emit('stop_typing', { 
                room: `conversation:${conversation.id}`, 
                username: currentUser.username
            });
        }

        if (typingTimeout) {
            clearTimeout(typingTimeout);
            setTypingTimeout(null);
        }

        try {
            console.log('Enviando mensagem para:', activeChatUser.username, 'Texto:', textToSend);
            const localId = `local-${Date.now()}`;
            const seq = currentConversation ? ((sendSeqRef.current[currentConversation.id] || 0) + 1) : 1;
            if (currentConversation) sendSeqRef.current[currentConversation.id] = seq;

            // Otimista: inicia sequência única de animação
            if (currentConversation && onMessageSent) {
                onMessageSent(currentConversation.id, {
                    id: localId,
                    conversationId: currentConversation.id,
                    senderId: currentUser.id,
                    text: textToSend,
                    imageUrl: null,
                    videoUrl: null,
                    glitchiType: null,
                    metadata: undefined,
                    status: 'sending',
                    messageStatus: 'sending',
                    clientSeq: seq,
                    isEncrypted: false,
                    createdAt: new Date(),
                } as any);

                // 800ms em "sending"
                setTimeout(() => {
                    onMessageSent(currentConversation.id, {
                        id: localId,
                        conversationId: currentConversation.id,
                        senderId: currentUser.id,
                        text: textToSend,
                        imageUrl: null,
                        videoUrl: null,
                        glitchiType: null,
                        metadata: undefined,
                        status: 'sending',
                        messageStatus: 'arrow',
                        clientSeq: seq,
                        isEncrypted: false,
                        createdAt: new Date(),
                    } as any);

                    // +200ms transição para "sent" e fixa horário HH:MM
                    setTimeout(() => {
                        onMessageSent(currentConversation.id, {
                            id: localId,
                            conversationId: currentConversation.id,
                            senderId: currentUser.id,
                            text: textToSend,
                            imageUrl: null,
                            videoUrl: null,
                            glitchiType: null,
                            metadata: undefined,
                            status: 'sent',
                            messageStatus: 'sent',
                            clientSeq: seq,
                            isEncrypted: false,
                            createdAt: new Date(),
                        } as any);
                    }, 200);
                }, 800);
            }

            // Dispara envio real ao backend em paralelo
            const response = await apiClient.sendMessageToUser(activeChatUser.username, textToSend);
            console.log('Resposta do servidor:', response);
            if (response?.error) {
                throw new Error(response.error);
            }

            // input já foi limpo para permitir nova digitação rápida

            // Concilia ID do servidor sem reprocessar animação
            if (currentConversation && onMessageSent && response?.data?.id) {
                onMessageSent(currentConversation.id, {
                    id: response.data.id,
                    conversationId: currentConversation.id,
                    senderId: currentUser.id,
                    text: response.data.text || textToSend,
                    imageUrl: response.data.imageUrl || null,
                    videoUrl: response.data.videoUrl || null,
                    glitchiType: response.data.glitchiType || null,
                    metadata: response.data.metadata || undefined,
                    status: 'sent',
                    messageStatus: 'sent',
                    isEncrypted: response.data.isEncrypted || false,
                    createdAt: new Date(response.data.createdAt || Date.now()),
                    _replaceId: localId, // dica para atualização por ID
                } as any);
            }

            setTimeout(() => scrollToBottom(), 100);
        } catch (error: any) {
            // Feedback de erro
            const errorMessage = error.message || 'Erro ao enviar mensagem. Tente novamente.';
            showToast(errorMessage, 'error');
            
            // Marcar última mensagem local como falha
            if (currentConversation && onMessageSent) {
                const failed: Message = {
                    id: `local-failed-${Date.now()}`,
                    conversationId: currentConversation.id,
                    senderId: currentUser.id,
                    text: textToSend,
                    imageUrl: null,
                    videoUrl: null,
                    glitchiType: null,
                    metadata: undefined,
                    status: 'failed',
                    messageStatus: 'sent',
                    isEncrypted: false,
                    createdAt: new Date(),
                };
                onMessageSent(currentConversation.id, failed);
            }
            
            // Mantém o texto no input em caso de erro (não precisa restaurar pois não limpamos antes)
            console.error('Failed to send message:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                response: error.response
            });
        } finally {
            setIsLoading(false);
            const convId = conversations.find(c => c.participants.includes(activeChatUser.username))?.id;
            if (convId) {
                const q = sendQueueRef.current[convId] || [];
                const next = q.shift();
                sendQueueRef.current[convId] = q;
                if (next) {
                    setMessageText(next);
                    setTimeout(() => handleSendMessage(), 0);
                }
            }
        }
    };

    const handleConversationClick = (conversation: Conversation) => {
        const partner = getPartner(conversation);
        onSetActiveChatUser(partner);
        setSearchQuery(''); // Limpa busca ao abrir conversa
    };

    const handleStartNewChat = (user: User) => {
        onSetActiveChatUser(user);
        setShowNewChat(false);
        setSearchQuery('');
    };

    // Filtered conversations based on search
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        
        const query = searchQuery.toLowerCase();
        return conversations.filter(conv => {
            const partner = getPartner(conv);
            return partner.username.toLowerCase().includes(query) ||
                   conv.messages.some(msg => msg.text.toLowerCase().includes(query));
        });
    }, [conversations, searchQuery, currentUser, allUsers]);

    // Filtered users for new chat
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim() || !showNewChat) return [];
        
        const query = searchQuery.toLowerCase();
        return allUsers.filter(user => 
            user.username.toLowerCase().includes(query) &&
            user.username !== currentUser.username &&
            !conversations.some(c => c.participants.includes(user.username))
        ).slice(0, 10); // Limita a 10 resultados
    }, [allUsers, searchQuery, showNewChat, currentUser, conversations]);

    // Format timestamp intelligently
    const formatTimestamp = (timestamp: Date | string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    };

    const formatLastSeen = (lastSeen: Date | string | null | undefined) => {
        if (!lastSeen) return 'Nunca visto';
        
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return 'Online agora';
        if (diffMins < 60) return `Visto há ${diffMins}m`;
        if (diffHours < 24) return `Visto há ${diffHours}h`;
        if (diffDays < 7) return `Visto há ${diffDays}d`;
        return `Visto em ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
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
            <div className={`fixed right-0 top-0 h-full w-full sm:w-[380px] bg-[var(--theme-bg-primary)] border-l border-[var(--theme-border-primary)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* View: Conversation List */}
                {!activeChatUser ? (
                    <div className="flex flex-col h-full animate-fade-in">
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--theme-border-primary)] flex justify-between items-center bg-[var(--theme-bg-secondary)]">
                            <h2 className="text-xl font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
                                <MessageIcon className="w-5 h-5" />
                                Directs
                            </h2>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setShowNewChat(!showNewChat)}
                                    className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors p-1"
                                    title="Nova conversa"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            <button onClick={onClose} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--theme-text-secondary)]" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.trim()) {
                                            setShowNewChat(true);
                                        }
                                    }}
                                    placeholder={showNewChat ? "Buscar usuários..." : "Buscar conversas..."}
                                    className="w-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] pl-10 pr-4 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] border border-transparent placeholder-gray-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setShowNewChat(false);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]"
                                    >
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* New Chat Users List */}
                        {showNewChat && filteredUsers.length > 0 && (
                            <div className="border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] max-h-48 overflow-y-auto overflow-x-hidden">
                                <div className="p-2 text-xs font-bold text-[var(--theme-text-secondary)] px-4 py-2">
                                    Iniciar conversa
                                </div>
                                {filteredUsers.map(user => {
                                    const bioText = (user.bio || '').length > 40 ? (user.bio || '').slice(0, 40) + '…' : (user.bio || '');
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => handleStartNewChat(user)}
                                            className="flex items-center gap-3 p-3 hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
                                        >
                                            <Avatar src={user.avatar} username={user.username} className="w-10 h-10 rounded-full flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-[var(--theme-text-primary)] block truncate">{user.username}</span>
                                                {bioText && (
                                                    <p className="text-xs text-gray-500 truncate">{bioText}</p>
                                                )}
                                            </div>
                                            <PaperPlaneIcon className="w-4 h-4 text-[var(--theme-primary)] flex-shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredConversations.length > 0 ? (
                                filteredConversations.sort((a, b) => {
                                    const at = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
                                    const bt = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
                                    return bt - at;
                                }).map(conv => {
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
                                            <div className="relative flex-shrink-0">
                                                <Avatar src={partner.avatar} username={partner.username} className="w-12 h-12 rounded-full" />
                                                {isUnread && (
                                                    <div className="absolute -right-1 -top-1 w-3 h-3 bg-[var(--theme-primary)] rounded-full border-2 border-[var(--theme-bg-primary)] animate-pulse" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`font-bold truncate ${isUnread ? 'text-white' : 'text-[var(--theme-text-secondary)]'}`}>
                                                        {partner.username}
                                                    </span>
                                                    <span className="text-xs text-[var(--theme-text-secondary)] whitespace-nowrap ml-2">
                                                        {lastMsg?.timestamp ? formatTimestamp(lastMsg.timestamp) : ''}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate ${isUnread ? 'text-white font-bold' : 'text-gray-500'}`}>
                                                    {lastMsg?.senderUsername === currentUser.username && 'Você: '}
                                                    {lastMsg?.text || 'Enviou um anexo'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : searchQuery ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-secondary)] opacity-50 gap-4">
                                    <SearchIcon className="w-16 h-16" />
                                    <p>Nenhuma conversa encontrada</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-secondary)] opacity-50 gap-4">
                                    <MessageIcon className="w-16 h-16" />
                                    <p>Sua caixa de entrada está vazia</p>
                                    <button
                                        onClick={() => setShowNewChat(true)}
                                        className="mt-4 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-full hover:brightness-110 transition-all flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Iniciar conversa
                                    </button>
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
                                        {activeChatUser.lastSeen && (() => {
                                            const lastSeenDate = new Date(activeChatUser.lastSeen);
                                            const diffMs = new Date().getTime() - lastSeenDate.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            const isOnline = diffMins < 5;
                                            return (
                                                <>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                                    {formatLastSeen(activeChatUser.lastSeen)}
                                                </>
                                            );
                                        })()}
                                        {!activeChatUser.lastSeen && (
                                            <>
                                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                                Nunca visto
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Body + Carregar mais */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--theme-bg-primary)]">
                            {currentConversation && currentConversation.messages.length >= 50 && (
                                <div className="flex justify-center">
                                    <button
                                        className="text-xs px-3 py-1 rounded-full bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]"
                                        onClick={async () => {
                                            setIsLoadingOlder(true);
                                            const oldest = [...currentConversation.messages].sort((a, b) => {
                                                const at = (a as any).timestamp || (a as any).createdAt;
                                                const bt = (b as any).timestamp || (b as any).createdAt;
                                                return new Date(at).getTime() - new Date(bt).getTime();
                                            })[0];
                                            try {
                                                const more = await apiClient.getMessages(currentConversation.id, { before: (oldest as any).timestamp?.toISOString?.() || (oldest as any).createdAt?.toISOString?.(), limit: 50 });
                                                if (more.data && more.data.length > 0) {
                                                const mapped = more.data.map((m: any) => ({
                                                    id: m.id,
                                                    senderId: m.sender_id,
                                                    senderUsername: m.sender_id === currentUser.id ? currentUser.username : (activeChatUser?.username || 'unknown'),
                                                    text: m.text,
                                                    imageUrl: m.image_url,
                                                    videoUrl: m.video_url,
                                                    status: m.status,
                                                    isEncrypted: m.is_encrypted,
                                                    timestamp: new Date(m.created_at || Date.now())
                                                }));
                                                    onAppendMessages?.(currentConversation.id, mapped);
                                                }
                                            } catch (e) {
                                                showToast('Falha ao carregar mais mensagens', 'error');
                                            } finally {
                                                setIsLoadingOlder(false);
                                            }
                                        }}
                                    >
                                        Carregar mais
                                    </button>
                                </div>
                            )}
                            {currentConversation?.messages.length > 0 ? (
                                [...currentConversation.messages].sort((a, b) => {
                                    const at = (a as any).timestamp || (a as any).createdAt;
                                    const bt = (b as any).timestamp || (b as any).createdAt;
                                    return new Date(at).getTime() - new Date(bt).getTime();
                                }).map((msg, idx) => {
                                const isMe = (msg as any).senderId ? (msg as any).senderId === currentUser.id : msg.senderUsername === currentUser.username;
                                
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div 
                                            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm break-words relative group ${
                                                isMe 
                                                    ? 'bg-red-600 text-white rounded-br-sm' 
                                                    : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                                            }`}
                                        >
                                            {msg.text}
                                                <div className={`flex items-center justify-between mt-1 gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span className={`text-[10px] opacity-70`}>
                                                        {((msg as any).messageStatus === 'sent') 
                                                            ? (() => {
                                                                const ts = (msg as any).timestamp || (msg as any).createdAt;
                                                                const d = ts ? new Date(ts) : null;
                                                                return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                                                              })()
                                                            : ''
                                                        }
                                                    </span>
                                                    {isMe && (
                                                        <span className="text-[10px] opacity-70 flex items-center gap-1">
                                                            {((msg as any).messageStatus === 'sending') && <span className="animate-pulse">Enviando…</span>}
                                                            {((msg as any).messageStatus === 'arrow') && <SendIcon className="w-3 h-3 transition-transform duration-200 translate-x-0" />}
                                                            {((msg as any).messageStatus === 'sent' || msg.status === 'sent') && <span className="text-green-300">✓</span>}
                                                            {msg.status === 'failed' && <span className="text-amber-300">Falha</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center justify-center h-full text-[var(--theme-text-secondary)] opacity-50">
                                    <p>Nenhuma mensagem ainda. Comece a conversa!</p>
                                </div>
                            )}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-800 text-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 text-sm">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border-primary)]">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={messageText}
                                    onChange={handleMessageInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-4 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] border border-transparent placeholder-gray-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!messageText.trim() || isLoading}
                                    className="p-2 bg-[var(--theme-primary)] text-white rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                    <SendIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

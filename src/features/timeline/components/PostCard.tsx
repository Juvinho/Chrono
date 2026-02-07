import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { Post, CyberpunkReaction, User } from '../../../types/index';
import { ReactIcon, GlitchIcon, UploadIcon, CorruptIcon, RewindIcon, StaticIcon, ReplyIcon, EchoIcon, EditIcon, VerifiedIcon, CheckCircleIcon, LockClosedIcon, DotsHorizontalIcon, TrashIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSound } from '../../../contexts/SoundContext';
import Avatar from '../../profile/components/Avatar';
import TypingIndicatorCard from './TypingIndicatorCard';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';

interface PostCardProps {
    post: Post;
    currentUser: User;
    onViewProfile: (username: string) => void;
    onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
    onReply: (parentPostId: string, content: string, isPrivate: boolean, media?: { imageUrl?: string, videoUrl?: string }) => void;
    onEcho: (postToEcho: Post) => void;
    onDelete: (postId: string) => void;
    onEdit: (postToEdit: Post) => void;
    onTagClick: (tag: string) => void;
    onPollVote: (postId: string, optionIndex: number) => void;
    typingParentIds: Set<string>;
    compact?: boolean;
    nestingLevel?: number;
    isThreadedReply?: boolean;
    isContextualView?: boolean;
    onPostClick?: (postId: string) => void;
}

const reactionIcons: { [key in CyberpunkReaction]: ReactNode } = {
    Glitch: <GlitchIcon className="w-5 h-5" />,
    Upload: <UploadIcon className="w-5 h-5" />,
    Corrupt: <CorruptIcon className="w-5 h-5" />,
    Rewind: <RewindIcon className="w-5 h-5" />,
    Static: <StaticIcon className="w-5 h-5" />,
};

// Função para formatar timestamps relativos
const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Menos de 1 minuto
    if (diffSecs < 60) {
        return 'agora';
    }
    
    // Menos de 1 hora
    if (diffMins < 60) {
        return `${diffMins}m`;
    }
    
    // Hoje
    if (diffHours < 24 && date.toDateString() === now.toDateString()) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Ontem
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `ontem ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Últimos 7 dias
    if (diffDays <= 7) {
        return `${diffDays}d ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Mais anterior
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
};

const PostCard: React.FC<PostCardProps> = React.memo(({ post, currentUser, onViewProfile, onUpdateReaction, onReply, onEcho, onDelete, onEdit, onTagClick, onPollVote, typingParentIds, compact = false, nestingLevel = 0, isThreadedReply = false, isContextualView = false, onPostClick }) => {
    const { t } = useTranslation();
    const { playSound } = useSound();
    const [showReactions, setShowReactions] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isReplyPrivate, setIsReplyPrivate] = useState(false);
    const [replyMedia, setReplyMedia] = useState<{ imageUrl?: string, videoUrl?: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [justVotedIndex, setJustVotedIndex] = useState<number | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const isTyping = typingParentIds?.has(post.id);
    const prevVotedOption = useRef(post.poll?.userVotedOption);
    
    // Time Capsule Logic
    const isLocked = post.unlockAt ? new Date(post.unlockAt) > new Date() : false;
    const canUnlock = post.author.username === currentUser.username; // Author can always see their own locked posts

    useEffect(() => {
        const currentUserVote = post.poll?.userVotedOption;
        const prevVote = prevVotedOption.current;

        if (prevVote === undefined && currentUserVote !== undefined && currentUserVote !== null) {
            setJustVotedIndex(currentUserVote);
            const timer = setTimeout(() => {
                setJustVotedIndex(null);
            }, 1000); // Animation duration
            return () => clearTimeout(timer);
        }

        prevVotedOption.current = post.poll?.userVotedOption;
    }, [post.poll?.userVotedOption, currentUser.username]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleReact = (reaction: CyberpunkReaction) => {
        playSound('like');
        onUpdateReaction(post.id, reaction);
        setShowReactions(false);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (file.type.startsWith('video/')) {
                    setReplyMedia({ videoUrl: result });
                } else {
                    setReplyMedia({ imageUrl: result });
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleReplySubmit = () => {
        if (!replyContent.trim() && !replyMedia) return;
        onReply(post.id, replyContent.trim(), isReplyPrivate, replyMedia || undefined);
        setReplyContent('');
        setReplyMedia(null);
        setIsReplying(false);
    };

    const handleDelete = () => {
        if (window.confirm(t('deletePostConfirmation'))) {
            setIsDeleting(true);
            setTimeout(() => {
                onDelete(post.id);
            }, 500); // Match animation duration
        }
        setShowMenu(false);
    }
    
    const renderContentWithTags = (content: string) => {
        // Regex to match $tags and @mentions, respecting punctuation and word boundaries
        // Matches $word or @word, ensuring it's not preceded by a non-whitespace character (unless it's the start of the string)
        // Validate and sanitize tags/mentions before processing
        const parts = content.split(/((?:^|\s)(?:\$[\w]{1,30}|@[\w]{1,30}))/g);
        
        return parts.map((part, index) => {
            if (!part) return null; // Skip empty parts
            
            const trimmedPart = part.trim();
            const prefix = part.startsWith(' ') ? ' ' : '';
            
            if (trimmedPart.startsWith('$') && /^\$[\w]{1,30}$/.test(trimmedPart)) {
                // Validate tag format: only letters, numbers, underscores, max 30 chars
                return (
                    <React.Fragment key={index}>
                        {prefix}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTagClick(trimmedPart); }} 
                            className="chrono-tag hover:text-[var(--theme-secondary)] transition-colors"
                        >
                            {trimmedPart}
                        </button>
                    </React.Fragment>
                );
            }
            
            if (trimmedPart.startsWith('@') && /^@[\w]{1,30}$/.test(trimmedPart)) {
                // Validate mention format: only letters, numbers, underscores, max 30 chars
                const username = trimmedPart.substring(1);
                return (
                    <React.Fragment key={index}>
                        {prefix}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onViewProfile(username); }} 
                            className="chrono-tag font-bold hover:text-[var(--theme-secondary)] transition-colors"
                        >
                            {trimmedPart}
                        </button>
                    </React.Fragment>
                );
            }
            
            // Render plain text - React automatically escapes content in JSX
            return <span key={index}>{part}</span>;
        });
    };

    const renderPoll = () => {
        if (!post.pollOptions) return null;

        const totalVotes = post.pollOptions.reduce((sum, option) => sum + option.votes, 0);
        const pollEnded = post.pollEndsAt ? new Date() > post.pollEndsAt : false;
        const votedFor = post.voters?.[currentUser.username];

        return (
            <div className="mt-4 space-y-2">
                {post.pollOptions.map((option, index) => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    return (
                        <div key={index} className="relative w-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm text-sm overflow-hidden">
                             <div 
                                className="absolute top-0 left-0 h-full bg-[var(--theme-primary)] opacity-30" 
                                style={{ width: `${percentage}%` }}
                            ></div>
                            <button 
                                onClick={() => onPollVote(post.id, index)}
                                disabled={pollEnded || votedFor !== undefined}
                                className={`relative w-full text-left p-2 flex justify-between items-center hover:bg-white/5 transition-colors disabled:cursor-not-allowed disabled:opacity-70 group ${justVotedIndex === index ? 'poll-vote-animation' : ''}`}
                            >
                                <span className="relative font-bold text-[var(--theme-text-light)] flex items-center">
                                    {votedFor === index && <CheckCircleIcon className="w-4 h-4 mr-2 text-[var(--theme-secondary)]" />}
                                    {option.option}
                                </span>
                                <span className="relative text-[var(--theme-text-secondary)]">{percentage.toFixed(0)}%</span>
                            </button>
                        </div>
                    );
                })}
                <div className="text-xs text-[var(--theme-text-secondary)] pt-1">
                    {t('pollTotalVotes', { count: totalVotes })} • {pollEnded ? t('pollEnded') : t('pollEndsIn', { time: post.pollEndsAt?.toLocaleDateString() || ''})}
                </div>
            </div>
        )
    }

    const reactions: CyberpunkReaction[] = ['Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'];
    const isAuthor = currentUser.username === post.author.username;
    
    // Extract tags for separate display
    const tags = React.useMemo(() => {
        const uniqueTags = new Set(post.content.match(/\$[\w]+/g) || []);
        return Array.from(uniqueTags);
    }, [post.content]);

    // Neural Mood Styling
    const moodColors = {
        'neon-joy': 'border-l-4 border-l-[#00ff9d] shadow-[inset_4px_0_10px_-2px_rgba(0,255,157,0.3)]',
        'void-despair': 'border-l-4 border-l-[#7b2cbf] shadow-[inset_4px_0_10px_-2px_rgba(123,44,191,0.3)]',
        'rage-glitch': 'border-l-4 border-l-[#ff003c] shadow-[inset_4px_0_10px_-2px_rgba(255,0,60,0.3)]',
        'zen-stream': 'border-l-4 border-l-[#00f3ff] shadow-[inset_4px_0_10px_-2px_rgba(0,243,255,0.3)]',
        'neutral': ''
    };
    
    const moodStyle = post.mood ? moodColors[post.mood] : '';

    const rootClasses = isThreadedReply
        ? '' // Replies have no outer box model of their own
        : `bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] mb-4 neon-glow-hover ${moodStyle}`;

    if (isLocked && !canUnlock) {
        return (
            <div className={`p-4 ${rootClasses} flex flex-col items-center justify-center text-center space-y-4`}>
                 <LockClosedIcon className="w-12 h-12 text-[var(--theme-primary)] animate-pulse" />
                 <div>
                     <h3 className="text-xl font-bold text-[var(--theme-text-light)]">Time Capsule</h3>
                     <p className="text-[var(--theme-text-secondary)]">
                         This memory is locked until {new Date(post.unlockAt!).toLocaleString()}
                     </p>
                 </div>
            </div>
        );
    }

    if (post.repostOf) {
        return (
            <div className={`p-4 ${rootClasses} ${isDeleting ? 'post-disintegrate' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-[var(--theme-text-secondary)] flex items-center">
                        <EchoIcon className="w-4 h-4 mr-2"/>
                        <button onClick={() => onViewProfile(post.author.username)} className="font-bold hover:text-[var(--theme-secondary)]">@{post.author.username}</button>
                        &nbsp;{t('postEchoed')}
                    </div>
                    {isAuthor && !isContextualView && (
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setShowMenu(prev => !prev)} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]">
                                <DotsHorizontalIcon className="w-5 h-5"/>
                            </button>
                            {showMenu && (
                                <div className="absolute top-full right-0 mt-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm z-10 animate-[fadeIn_0.2s_ease-in-out] w-36">
                                    <button onClick={handleDelete} className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-[var(--theme-border-primary)]">
                                        <TrashIcon className="w-4 h-4" />
                                        <span>{t('postDelete')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {post.content && <p className="mb-2 italic">"{post.content}"</p>}
                <div className="border border-[var(--theme-border-secondary)] p-0">
                     <PostCard 
                        post={post.repostOf} 
                        currentUser={currentUser}
                        onViewProfile={onViewProfile} 
                        onUpdateReaction={onUpdateReaction}
                        onReply={onReply}
                        onEcho={onEcho}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onTagClick={onTagClick}
                        onPollVote={onPollVote}
                        typingParentIds={typingParentIds}
                        nestingLevel={nestingLevel + 1}
                        isContextualView={true}
                     />
                </div>
            </div>
        )
    }

    return (
        <div className={`${rootClasses} ${compact ? 'p-3' : 'p-4'} ${isDeleting ? 'post-disintegrate' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center mb-3">
                    <div className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0 cursor-pointer hover:scale-105 transition-transform mr-3`} onClick={() => onViewProfile(post.author.username)}>
                         <div className={`w-full h-full overflow-hidden border border-[var(--theme-border-primary)] shadow-[0_0_10px_rgba(0,243,255,0.2)] ${post.author.equippedFrame ? getFrameShape(post.author.equippedFrame.name) : 'rounded-full'}`}>
                            <Avatar 
                                src={post.author.avatar || 'https://picsum.photos/seed/user/100/100'} 
                                username={post.author.username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => onViewProfile(post.author.username)} className={`font-bold text-[var(--theme-text-light)] hover:text-[var(--theme-secondary)] transition-colors ${compact ? 'text-sm' : ''}`}>
                                @{post.author.username}
                            </button>
                            {post.author.isVerified && post.author.verificationBadge && (
                                <div className="flex items-center">
                                    {post.author.verificationBadge.label === 'Criador' && post.author.verificationBadge.color === 'red' ? (
                                        <span 
                                            className="bg-[#ff003c] text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold flex items-center mr-1 uppercase tracking-tighter shadow-[0_0_8px_rgba(255,0,60,0.4)] border border-[#ff4d7a] animate-pulse-soft"
                                            title="Verificado: Criador do Sistema"
                                        >
                                            Criador
                                        </span>
                                    ) : (
                                        <VerifiedIcon 
                                            className="w-4 h-4"
                                            style={{ color: post.author.verificationBadge.color }}
                                            title={post.author.verificationBadge.label}
                                        />
                                    )}
                                </div>
                            )}
                            {post.isPrivate && <LockClosedIcon className="w-3 h-3 text-[var(--theme-text-secondary)]" title={t('postPrivate')} />}
                        </div>
                        <p className={`text-[var(--theme-text-secondary)] ${compact ? 'text-xs' : 'text-sm'}`}>{formatRelativeTime(post.timestamp)}</p>
                    </div>
                </div>
                <div className="relative" ref={menuRef}>
                    {!isContextualView && (
                        <button 
                            onClick={() => setShowMenu(prev => !prev)} 
                            className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)]"
                            aria-label={t('postMenuLabel') || 'Post Options'}
                        >
                            <DotsHorizontalIcon className="w-5 h-5"/>
                        </button>
                    )}
                    {showMenu && (
                        <div className="absolute top-full right-0 mt-1 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm z-10 animate-[fadeIn_0.2s_ease-in-out] w-36">
                            {isAuthor && (
                                <>
                                    <button 
                                        onClick={() => { onEdit(post); setShowMenu(false); }} 
                                        className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-[var(--theme-text-light)] hover:bg-[var(--theme-border-primary)]"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                        <span>{t('postEdit')}</span>
                                    </button>
                                    <button 
                                        onClick={handleDelete} 
                                        className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-[var(--theme-border-primary)]"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>{t('postDelete')}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {post.inReplyTo && !compact && (
                <div className="mb-2 text-sm">
                    <div className="p-2 border-l-2 border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)] rounded-r-md">
                        <div className="flex items-center space-x-2 text-[var(--theme-text-secondary)]">
                            {(() => {
                                const replyAvatarShape = post.inReplyTo!.author.equippedFrame ? getFrameShape(post.inReplyTo!.author.equippedFrame.name) : 'rounded-full';
                                return (
                                    <div className="relative w-4 h-4">
                                        <Avatar src={post.inReplyTo!.author.avatar} username={post.inReplyTo!.author.username} className={`w-full h-full ${replyAvatarShape} object-cover`} />
                                        {post.inReplyTo!.author.equippedFrame && (
                                            <div className="absolute -inset-0.5 z-20 pointer-events-none">
                                                <FramePreview item={post.inReplyTo!.author.equippedFrame} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <button 
                                onClick={() => onViewProfile(post.inReplyTo!.author.username)} 
                                className="font-bold chrono-tag"
                                aria-label={t('viewProfileLabel', { username: post.inReplyTo!.author.username }) || `View @${post.inReplyTo!.author.username}'s profile`}
                            >
                                @{post.inReplyTo!.author.username}
                            </button>
                        </div>
                        <p className="mt-1 italic text-[var(--theme-text-primary)] opacity-80 truncate">
                            {post.inReplyTo.content}
                        </p>
                    </div>
                </div>
            )}

            {isLocked && !canUnlock ? (
                <div className="flex flex-col items-center justify-center p-8 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] border-dashed rounded-sm my-4">
                    <LockClosedIcon className="w-8 h-8 text-[var(--theme-secondary)] mb-2" />
                    <h3 className="text-[var(--theme-primary)] font-bold text-lg mb-1">{t('timeCapsuleLocked') || 'Time Capsule Locked'}</h3>
                    <p className="text-[var(--theme-text-secondary)] text-sm text-center">
                        {t('unlocksAt') || 'Unlocks at'}: {post.unlockAt ? new Date(post.unlockAt).toLocaleString() : 'Unknown'}
                    </p>
                </div>
            ) : (
                <>
                    <p 
                        className={`whitespace-pre-wrap ${compact ? 'text-sm mb-2' : 'mb-4'} ${!isThreadedReply ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        onClick={() => !isThreadedReply && onPostClick?.(post.id)}
                    >
                        {renderContentWithTags(post.content)}
                    </p>
                    {post.imageUrl && (
                        <img src={post.imageUrl} alt={t('postImageAlt', { username: post.author.username }) || `Image posted by @${post.author.username}`} className="w-full object-cover rounded-sm mt-2" loading="lazy" />
                    )}
                    {post.videoUrl && (
                        <video src={post.videoUrl} controls muted loop className="w-full object-cover rounded-sm mt-2 bg-black" aria-label={t('postVideoLabel', { username: post.author.username }) || `Video posted by @${post.author.username}`}></video>
                    )}
                    {renderPoll()}
                    
                    {/* Cords / Tags Section */}
                    {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--theme-bg-tertiary)] text-[var(--theme-secondary)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-primary)] hover:border-[var(--theme-secondary)] hover:shadow-[0_0_8px_rgba(0,243,255,0.3)] transition-all"
                                    aria-label={t('viewTagLabel', { tag }) || `View posts with tag ${tag}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
            
            {post.replies && post.replies.length > 0 && (
                <div className="reply-container">
                    {/* In feed view, limit to 3 replies. In thread view, show all */}
                    {(!isThreadedReply && !isContextualView 
                        ? post.replies.slice(0, 3) 
                        : post.replies
                    ).map(reply => (
                        <PostCard 
                            key={reply.id} 
                            post={reply} 
                            currentUser={currentUser}
                            onViewProfile={onViewProfile}
                            onUpdateReaction={onUpdateReaction}
                            onReply={onReply}
                            onEcho={onEcho}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onTagClick={onTagClick}
                            onPollVote={onPollVote}
                            typingParentIds={typingParentIds}
                            nestingLevel={nestingLevel + 1}
                            isThreadedReply={true}
                            onPostClick={onPostClick}
                        />
                    ))}
                    
                    {/* Show "View all replies" button if there are more than 3 replies in feed view */}
                    {!isThreadedReply && !isContextualView && post.replies.length > 3 && (
                        <button
                            onClick={() => onPostClick?.(post.id)}
                            className="ml-4 mt-3 px-3 py-1.5 text-sm text-[var(--theme-primary)] hover:text-[var(--theme-secondary)] bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] hover:border-[var(--theme-primary)] rounded transition-all font-medium"
                            aria-label={`View thread with ${post.replies.length - 3} more replies`}
                        >
                            💬 Ver todos os {post.replies.length} coment{post.replies.length !== 1 ? 'ários' : 'ário'}
                        </button>
                    )}
                </div>
            )}
            {!isThreadedReply && isTyping && <TypingIndicatorCard />}

            <div className="mt-4 flex items-center justify-between text-[var(--theme-text-secondary)] border-t border-[var(--theme-border-primary)] pt-2">
                <div className="flex items-center space-x-3 overflow-x-auto">
                    {post.reactions && Object.entries(post.reactions).map(([reaction, count]) => (
                        <span 
                            key={reaction} 
                            className="text-xs flex items-center space-x-1 flex-shrink-0" 
                            title={reaction}
                            aria-label={`${count} ${reaction} reactions`}
                        >
                           {reactionIcons[reaction as CyberpunkReaction]}
                           <span className="text-[var(--theme-primary)] font-bold">{count}</span>
                        </span>
                    ))}
                </div>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setIsReplying(!isReplying)} 
                        className="flex items-center space-x-1 hover:text-[var(--theme-secondary)] transition-colors" 
                        title={t('postReply')}
                        aria-label={t('postReply') || 'Reply to post'}
                    >
                        <ReplyIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onEcho(post)} 
                        className="flex items-center space-x-1 hover:text-[var(--theme-secondary)] transition-colors" 
                        title={t('postEcho')}
                        aria-label={t('postEcho') || 'Echo post'}
                    >
                        <EchoIcon className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowReactions(!showReactions)} 
                            className="flex items-center space-x-1 hover:text-[var(--theme-secondary)] transition-colors" 
                            title={t('postReact')}
                            aria-label={t('postReact') || 'React to post'}
                        >
                            <ReactIcon className="w-5 h-5" />
                        </button>
                        {showReactions && (
                            <div className="absolute bottom-full right-0 mb-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm p-1 flex space-x-1 z-10 animate-[fadeIn_0.2s_ease-in-out]">
                                {reactions.map(reaction => (
                                    <button 
                                        key={reaction} 
                                        onClick={() => handleReact(reaction)} 
                                        className="reaction-button" 
                                        title={reaction}
                                        aria-label={reaction}
                                    >
                                        {reactionIcons[reaction]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isReplying && (
                <div className="mt-2">
                     <div className="text-sm text-[var(--theme-text-secondary)] mb-2">
                        {t('replyingTo')}{' '}
                        <button onClick={() => onViewProfile(post.author.username)} className="chrono-tag">@{post.author.username}</button>
                     </div>
                     <textarea
                        placeholder={t('postReplyTo', { username: post.author.username })}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] rounded-sm py-1 px-3 text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] resize-none"
                        rows={2}
                        autoFocus
                    />
                    
                    {replyMedia && (
                        <div className="mt-2 relative inline-block">
                            {replyMedia.imageUrl ? (
                                <img src={replyMedia.imageUrl} alt="Reply media" className="h-20 w-auto rounded border border-[var(--theme-border-primary)]" />
                            ) : (
                                <video src={replyMedia.videoUrl} className="h-20 w-auto rounded border border-[var(--theme-border-primary)]" />
                            )}
                            <button 
                                onClick={() => setReplyMedia(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="mt-2 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => setIsReplyPrivate(p => !p)} 
                                className="flex items-center space-x-2 text-sm text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]"
                                title={t('postMakePrivate')}
                            >
                                <LockClosedIcon className={`w-4 h-4 ${isReplyPrivate ? 'text-[var(--theme-primary)]' : ''}`} />
                                <span>{isReplyPrivate ? t('postPrivate') : t('postPublic')}</span>
                            </button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                className="hidden" 
                                accept="image/*,video/*" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className={`text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] ${replyMedia ? 'text-[var(--theme-primary)]' : ''}`}
                                title={t('attachMedia')}
                            >
                                <UploadIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handleReplySubmit}
                            disabled={!replyContent.trim() && !replyMedia}
                            className="bg-[var(--theme-primary)] text-white px-4 py-1 rounded-sm text-sm hover:bg-[var(--theme-secondary)] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {t('postReplyButton')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default React.memo(PostCard);

export interface Message {
    id: string;
    senderId?: string;
    senderUsername: string;
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    glitchiType?: string;
    timestamp: Date;
    status?: 'sent' | 'delivered' | 'read';
}
export interface Conversation {
    id: string;
    participants: string[];
    messages: Message[];
    lastMessageTimestamp: Date;
    unreadCount: {
        [username: string]: number;
    };
    isEncrypted?: boolean;
    selfDestructTimer?: number;
}
export type CyberpunkReaction = 'Glitch' | 'Upload' | 'Corrupt' | 'Rewind' | 'Static';
export type TagCategory = 'positive' | 'moderation' | 'time' | 'style';
export type TagVisibility = 'public' | 'private' | 'admin_only';
export interface TagDefinition {
    id: string;
    nome: string;
    icone: string;
    cor_hex: string;
    cor_border: string;
    prioridade_exibicao: number;
    categoria: TagCategory;
    visibilidade: TagVisibility;
    condicao_aquisicao: Record<string, any>;
    condicao_remocao?: Record<string, any>;
    descricao_publica: string;
    descricao_interna?: string;
    notificar_aquisicao?: boolean;
    notificar_remocao?: boolean;
    criado_em: Date;
    atualizado_em: Date;
}
export interface UserTag {
    id: string;
    userId: string;
    tagId: string;
    tag?: TagDefinition;
    adquirida_em: Date;
    removida_em?: Date | null;
    motivo_remocao?: string;
    ativo: boolean;
}
export interface ProfileSettings {
    theme: 'dark' | 'light';
    accentColor: 'purple' | 'green' | 'amber' | 'red' | 'blue';
    effect: 'none' | 'scanline' | 'glitch_overlay';
    themeSkin?: string;
    coverImage: string;
    animationsEnabled?: boolean;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    autoRefreshEnabled?: boolean;
    autoRefreshInterval?: number;
}
export type NotificationType = 'reply' | 'reaction' | 'follow' | 'mention' | 'repost' | 'directMessage';
export interface Notification {
    id: string;
    notificationType: NotificationType;
    actor: User;
    post?: Post;
    read: boolean;
    timestamp: Date;
}
export interface User {
    id: string;
    username: string;
    email?: string;
    password?: string;
    avatar: string;
    bio: string;
    birthday: string;
    pronouns?: string;
    location?: string;
    website?: string;
    coverImage: string;
    followers: number;
    following: number;
    profileType?: 'personal' | 'professional';
    headline?: string;
    skills?: string[];
    workExperience?: {
        company: string;
        role: string;
        duration: string;
        description: string;
    }[];
    education?: {
        school: string;
        degree: string;
        year: string;
    }[];
    profileSettings?: ProfileSettings;
    followingList?: string[];
    followersList?: string[];
    notifications?: Notification[];
    blockedUsers?: string[];
    isPrivate?: boolean;
    isVerified?: boolean;
    verificationBadge?: {
        label: string;
        color: string;
    };
    createdAt?: string | Date;
    subscriptionTier?: 'free' | 'pro' | 'pro_plus';
    subscriptionExpiresAt?: Date;
    lastSeen?: Date | string | null;
    equippedFrame?: Item;
    equippedEffect?: Item;
    tags?: UserTag[];
}
export interface Item {
    id: string;
    type: 'frame' | 'effect' | 'badge' | 'theme';
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
export interface UserItem {
    id: string;
    userId: string;
    itemId: string;
    isEquipped: boolean;
    purchasedAt: Date;
    item?: Item;
}
export interface Post {
    id: string;
    author: User;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    timestamp: string | Date;
    likes: number;
    replies?: Post[];
    reposts?: number;
    likedBy: string[];
    isThread?: boolean;
    repostOf?: Post;
    inReplyTo?: Post;
    reactions?: {
        [key in CyberpunkReaction]?: number;
    };
    userReaction?: CyberpunkReaction;
    poll?: {
        options: {
            option: string;
            votes: number;
        }[];
        totalVotes: number;
        userVotedOption?: number | null;
        endsAt?: Date;
    };
    isPrivate?: boolean;
    viewCount?: number;
    unlockAt?: string | Date;
    mood?: 'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral';
}
export declare enum Page {
    Welcome = 0,
    Login = 1,
    Register = 2,
    Verify = 3,
    Dashboard = 4,
    Profile = 5,
    Settings = 6,
    ForgotPassword = 7,
    ResetPassword = 8,
    Messages = 9,
    VideoAnalysis = 10,
    ChatTest = 11
}
declare global {
    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }
    interface SpeechRecognitionResultList {
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }
    interface SpeechRecognitionResult {
        readonly isFinal: boolean;
        readonly length: number;
        item(index: number): SpeechRecognitionAlternative;
        [index: number]: SpeechRecognitionAlternative;
    }
    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }
    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: string;
        readonly message: string;
    }
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: SpeechRecognitionErrorEvent) => void;
        onstart: () => void;
        onend: () => void;
        start(): void;
        stop(): void;
    }
    interface Window {
        SpeechRecognition: {
            new (): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new (): SpeechRecognition;
        };
    }
    var SpeechRecognition: {
        new (): SpeechRecognition;
    };
    var webkitSpeechRecognition: {
        new (): SpeechRecognition;
    };
}
//# sourceMappingURL=index.d.ts.map
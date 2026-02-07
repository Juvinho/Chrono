import React, { useState, useCallback, useEffect } from 'react';
import { Post, User } from '../../types/index';
import { SearchIcon } from './icons';
import { useTranslation } from '../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../../features/profile/components/FramePreview';
import Avatar from '../../features/profile/components/Avatar';
import { SearchService, SearchResults, TrendingCordao } from '../../services/searchService';

interface SearchOverlayProps {
    onClose: () => void;
    onSearch: (query: string) => void;
    onViewProfile: (username: string) => void;
    allUsers: User[];
    allPosts: Post[];
    currentUser: User;
}

/**
 * SearchOverlay - Sistema de pesquisa completo e refatorado
 * Arquitetura limpa e modular com lógica centralizada em SearchService
 */
export default function SearchOverlay({ 
    onClose, 
    onSearch, 
    onViewProfile, 
    allUsers, 
    allPosts, 
    currentUser 
}: SearchOverlayProps) {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [trendingCordoes, setTrendingCordoes] = useState<TrendingCordao[]>([]);
    const [recommendations, setRecommendations] = useState<ReturnType<typeof SearchService.getRecommendations> | null>(null);

    // Carregar cordões trending e recomendações ao abrir
    useEffect(() => {
        const load = async () => {
            const trending = await SearchService.fetchTrendingCordoes();
            setTrendingCordoes(trending);
        };
        load();
        setRecommendations(SearchService.getRecommendations(allPosts, allUsers, currentUser));
    }, [allPosts, allUsers, currentUser]);

    // Pesquisa com debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const results = await SearchService.performSearch(searchTerm, allPosts, allUsers);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchResults(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults(null);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, allPosts, allUsers]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    }, [searchTerm, onSearch]);

    const isSearching = searchTerm.trim().length > 0;
    const hasResults = searchResults ? searchResults.total > 0 : false;

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="search-overlay-content" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <SearchInput 
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    placeholder={t('searchChrono')}
                />

                {/* Results or Recommendations */}
                <div className="mt-8">
                    {isSearching ? (
                        isLoading ? (
                            <LoadingState />
                        ) : hasResults ? (
                            <SearchResultsSection 
                                results={searchResults!}
                                allPosts={allPosts}
                                onSearch={onSearch}
                                onViewProfile={onViewProfile}
                            />
                        ) : (
                            <NoResultsState searchTerm={searchTerm} />
                        )
                    ) : (
                        recommendations && (
                            <RecommendationsSection 
                                recommendations={recommendations}
                                trendingCordoes={trendingCordoes}
                                onSearch={onSearch}
                                onViewProfile={onViewProfile}
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Componentes Auxiliares
 */

// Input de busca
function SearchInput({ 
    value, 
    onChange, 
    onSubmit, 
    isLoading, 
    placeholder 
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    placeholder: string;
}) {
    return (
        <form onSubmit={onSubmit} className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="search-input"
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2">
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[var(--theme-text-secondary)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
                ) : (
                    <SearchIcon className="w-8 h-8 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors" />
                )}
            </button>
        </form>
    );
}

// Estado de carregamento
function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[var(--theme-primary)] font-mono tracking-widest">ACCESSING MAINFRAME...</p>
        </div>
    );
}

// Estado sem resultados
function NoResultsState({ searchTerm }: { searchTerm: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
            <h3 className="text-2xl font-bold text-red-500">NO SIGNAL</h3>
            <p className="text-[var(--theme-text-secondary)] text-sm">No results for "{searchTerm}"</p>
        </div>
    );
}

// Seção de resultados
function SearchResultsSection({ 
    results, 
    allPosts, 
    onSearch, 
    onViewProfile 
}: {
    results: SearchResults;
    allPosts: Post[];
    onSearch: (query: string) => void;
    onViewProfile: (username: string) => void;
}) {
    return (
        <div className="space-y-8">
            {results.users.length > 0 && (
                <ResultSection title="Users" count={results.users.length}>
                    {results.users.map(u => (
                        <UserCard key={u.username} user={u} onViewProfile={onViewProfile} />
                    ))}
                </ResultSection>
            )}

            {results.cordoes.length > 0 && (
                <ResultSection title="Cordões" count={results.cordoes.length}>
                    {results.cordoes.map(c => (
                        <CordaoCard key={c.id} cordao={c} onClick={() => onSearch(SearchService.extractCordoes(c.content)[0] || c.content)} />
                    ))}
                </ResultSection>
            )}

            {results.posts.length > 0 && (
                <ResultSection title="Echoes" count={results.posts.length}>
                    {results.posts.map(p => (
                        <PostCard key={p.id} post={p} onSearch={onSearch} />
                    ))}
                </ResultSection>
            )}
        </div>
    );
}

// Seção de recomendações
function RecommendationsSection({ 
    recommendations, 
    trendingCordoes, 
    onSearch, 
    onViewProfile 
}: {
    recommendations: ReturnType<typeof SearchService.getRecommendations>;
    trendingCordoes: TrendingCordao[];
    onSearch: (query: string) => void;
    onViewProfile: (username: string) => void;
}) {
    return (
        <div className="space-y-8">
            <h2 className="text-xl font-bold text-center text-[var(--theme-secondary)]">:: ALTERNATIVE TIMELINES ::</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Users */}
                <div className="space-y-4">
                    <h3 className="text-center font-bold text-[var(--theme-secondary)]">:: SUGGESTED USERS ::</h3>
                    <div className="space-y-2">
                        {recommendations.suggestedUsers.map(u => (
                            <UserCard key={u.username} user={u} onViewProfile={onViewProfile} />
                        ))}
                    </div>
                </div>

                {/* Trending Cordoes */}
                <div className="space-y-4">
                    <h3 className="text-center font-bold text-red-500">:: TRENDING CORDÕES ::</h3>
                    <div className="space-y-2">
                        {trendingCordoes.length > 0 ? (
                            trendingCordoes.map(c => (
                                <TrendingCordaoCard key={c.tag} cordao={c} onSearch={onSearch} />
                            ))
                        ) : (
                            recommendations.popularCordoes.map(c => (
                                <CordaoCard key={c.id} cordao={c} onClick={() => onSearch(SearchService.extractCordoes(c.content)[0] || c.content)} />
                            ))
                        )}
                    </div>
                </div>

                {/* Popular Posts */}
                <div className="space-y-4">
                    <h3 className="text-center font-bold text-[var(--theme-secondary)]">:: POPULAR ECHOES ::</h3>
                    <div className="space-y-2">
                        {recommendations.popularPosts.map(p => (
                            <PostCard key={p.id} post={p} onSearch={onSearch} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Cards dos resultados
 */

function ResultSection({ 
    title, 
    count, 
    children 
}: {
    title: string;
    count: number;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--theme-secondary)]">
                :: {title} ({count}) ::
            </h3>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

function UserCard({ 
    user, 
    onViewProfile 
}: {
    user: User;
    onViewProfile: (username: string) => void;
}) {
    const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';
    
    return (
        <button
            onClick={() => onViewProfile(user.username)}
            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors text-left group"
        >
            <div className="relative w-8 h-8 flex-shrink-0">
                <Avatar src={user.avatar} username={user.username} className={`w-full h-full ${avatarShape} object-cover`} />
                {user.equippedFrame && (
                    <div className="absolute -inset-1 z-20 pointer-events-none">
                        <FramePreview item={user.equippedFrame} />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-secondary)] truncate">@{user.username}</p>
                <p className="text-xs text-[var(--theme-text-secondary)]">{user.followers || 0} followers</p>
            </div>
        </button>
    );
}

function CordaoCard({ 
    cordao, 
    onClick 
}: {
    cordao: Post;
    onClick: () => void;
}) {
    const tag = SearchService.extractCordoes(cordao.content)[0];
    
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 hover:bg-red-900/20 rounded-sm transition-colors border-l-2 border-red-500 bg-black/30 focus:outline-none focus:ring-1 focus:ring-red-500"
        >
            <p className="font-bold text-red-500 truncate">{tag}</p>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-1">by @{cordao.author.username}</p>
        </button>
    );
}

function TrendingCordaoCard({ 
    cordao, 
    onSearch 
}: {
    cordao: TrendingCordao;
    onSearch: (query: string) => void;
}) {
    return (
        <button
            onClick={() => onSearch(cordao.displayName)}
            className="w-full text-left p-3 hover:bg-red-900/20 rounded-sm transition-colors border-l-2 border-red-500 bg-black/30"
        >
            <p className="font-bold text-red-500 text-sm">{cordao.displayName}</p>
            <p className="text-xs text-red-400 mt-1">📊 {cordao.mentions.toLocaleString()} mentions</p>
        </button>
    );
}

function PostCard({ 
    post, 
    onSearch 
}: {
    post: Post;
    onSearch: (query: string) => void;
}) {
    return (
        <button
            onClick={() => onSearch(`${post.id}`)}
            className="w-full text-left p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-sm transition-colors text-sm"
        >
            <p className="text-[var(--theme-text-primary)] truncate">{post.content}</p>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-1">by @{post.author.username}</p>
        </button>
    );
}

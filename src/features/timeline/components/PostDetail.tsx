import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, User, CyberpunkReaction } from '../../../types/index';
import { apiClient } from '../../../api';
import { mapApiPostToPost } from '../../../api/mappers';
import PostCard from './PostCard';
import { PostComposer } from './PostComposer';
import { ChevronLeftIcon } from '../../../components/ui/icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { postIdMapper } from '../../../utils/postIdMapper';

interface PostDetailProps {
  currentUser: User;
  allUsers: User[];
  allPosts: Post[];
  onReply: (parentId: string, content: string, isPrivate: boolean, media?: any) => void;
  onUpdateReaction: (postId: string, reaction: CyberpunkReaction) => void;
  onEcho: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, data: any) => void;
  onPollVote: (postId: string, optionIndex: number) => void;
  onViewProfile: (username: string) => void;
  onBack: () => void;
  typingParentIds: Set<string>;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  currentUser,
  allUsers,
  allPosts,
  onReply,
  onUpdateReaction,
  onEcho,
  onDeletePost,
  onEditPost,
  onPollVote,
  onViewProfile,
  onBack,
  typingParentIds,
}) => {
  const { t } = useTranslation();
  const { randomId } = useParams<{ randomId: string }>();
  const navigate = useNavigate();
  
  // Resolve ID once to avoid recalculation
  const realIdFromMapper = randomId ? postIdMapper.resolveId(randomId) : null;
  const postFromAllPosts = realIdFromMapper ? allPosts.find(p => p.id === realIdFromMapper) : null;
  
  const [rootPost, setRootPost] = useState<Post | null>(postFromAllPosts || null);
  const [loading, setLoading] = useState(!postFromAllPosts && !!randomId);
  const [error, setError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!randomId) {
        setError('Post ID não fornecido');
        setLoading(false);
        return;
      }

      // If we already have the post, don't fetch again
      if (rootPost) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        // Resolve o ID real usando o mapper
        const realId = postIdMapper.resolveId(randomId);
        
        if (!realId) {
          setError('Post não encontrado');
          return;
        }

        // Tenta buscar da API
        const response = await apiClient.getPost(realId);
        
        if (response.error) {
          // Se não achar, tenta nos posts locais
          const localPost = allPosts.find(p => p.id === realId);
          if (localPost) {
            setRootPost(localPost);
          } else {
            setError(response.error);
          }
          return;
        }

        const mappedPost = mapApiPostToPost(response.data || response);
        setRootPost(mappedPost);
      } catch (err: any) {
        console.error('Failed to load post:', err);
        setError(err.message || 'Erro ao carregar o post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [randomId, rootPost]);

  const handleReplySubmit = (content: string, isPrivate: boolean, media?: any) => {
    if (rootPost) {
      onReply(rootPost.id, content, isPrivate, media);
      setIsComposerOpen(false);
      setReplyingTo(null);
    }
  };

  const handleRenderReplies = (post: Post, depth: number = 0): React.ReactNode[] => {
    const result: React.ReactNode[] = [];

    // Render current post
    result.push(
      <div
        key={`post-${post.id}`}
        className={`${
          depth === 0 ? 'border-b-2 border-[var(--theme-primary)]' : ''
        } pb-4 mb-4`}
      >
        <PostCard
          post={post}
          currentUser={currentUser}
          onViewProfile={onViewProfile}
          onUpdateReaction={onUpdateReaction}
          onReply={() => {
            setReplyingTo(post);
            setIsComposerOpen(true);
          }}
          onEcho={onEcho}
          onDelete={onDeletePost}
          onEdit={onEditPost}
          onTagClick={() => {}}
          onPollVote={onPollVote}
          typingParentIds={typingParentIds}
          nestingLevel={depth}
          isThreadedReply={depth > 0}
          isContextualView={true}
        />
      </div>
    );

    // Render replies
    if (post.replies && post.replies.length > 0) {
      result.push(
        <div key={`replies-${post.id}`} className="ml-0 md:ml-4 border-l-2 border-[var(--theme-primary)] pl-4">
          {post.replies.map((reply) => (
            <div key={`reply-container-${reply.id}`}>
              {handleRenderReplies(reply, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    return result;
  };

  if (loading) {
    return null;
  }

  if (error || !rootPost) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
        <div className="sticky top-0 z-40 bg-[var(--theme-bg-primary)] border-b-2 border-[var(--theme-primary)]">
          <div className="flex items-center justify-between gap-4 p-4 max-w-4xl mx-auto w-full">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded hover:bg-[var(--theme-bg-secondary)] transition-colors"
              title={t('goBack')}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
          <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary)]">{t('threadNotFound')}</h2>
          <p className="text-[var(--theme-text-secondary)] mb-6">{error || 'Post não encontrado'}</p>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-primary)] rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            {t('goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--theme-bg-primary)] border-b-2 border-[var(--theme-primary)]">
        <div className="flex items-center justify-between gap-4 p-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded hover:bg-[var(--theme-bg-secondary)] transition-colors"
              title={t('goBack')}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{t('thread')}</h1>
              {rootPost && rootPost.replies && rootPost.replies.length > 0 && (
                <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                  💬 {rootPost.replies.length} comentário{rootPost.replies.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thread Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="space-y-0">
          {handleRenderReplies(rootPost)}
        </div>

        {/* Reply Composer */}
        {isComposerOpen && (
          <div className="mt-6 p-4 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-primary)]">
            <div className="flex items-start gap-3 mb-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold text-[var(--theme-text-primary)]">
                  Respondendo para {replyingTo?.author?.display_name || 'usuário'}
                </p>
                {replyingTo && (
                  <p className="text-sm text-[var(--theme-text-secondary)] truncate">
                    "{replyingTo.content}"
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsComposerOpen(false);
                  setReplyingTo(null);
                }}
                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              >
                ✕
              </button>
            </div>
            <PostComposer
              currentUser={currentUser}
              onClose={() => {
                setIsComposerOpen(false);
                setReplyingTo(null);
              }}
              onSubmit={handleReplySubmit}
              inline
              initialContent={`@${replyingTo?.author?.username || ''} `}
            />
          </div>
        )}

        {/* Button to open composer if not open */}
        {!isComposerOpen && (
          <button
            onClick={() => setIsComposerOpen(true)}
            className="mt-6 w-full py-3 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-secondary)] transition-colors font-semibold"
          >
            + Responder
          </button>
        )}
      </div>
    </div>
  );
};

export default PostDetail;

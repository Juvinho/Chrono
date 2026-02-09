import React, { useState, useEffect, useRef } from 'react';
import { CyberpunkReaction } from '../../../types/index';
import { postService } from '../../../api/post.service';
import { GlitchIcon, UploadIcon, CorruptIcon, RewindIcon, StaticIcon } from '../../../components/ui/icons';
import './styles/reaction-tooltip.css';

interface ReactionDetails extends Record<CyberpunkReaction, {
  count: number;
  users: Array<{ id: string; username: string; avatar: string }>;
}> {}

interface ReactionTooltipProps {
  postId: string;
  reactions: { [key in CyberpunkReaction]?: number };
  isVisible: boolean;
}

const reactionIcons: { [key in CyberpunkReaction]: React.ReactNode } = {
  Glitch: <GlitchIcon className="w-4 h-4" />,
  Upload: <UploadIcon className="w-4 h-4" />,
  Corrupt: <CorruptIcon className="w-4 h-4" />,
  Rewind: <RewindIcon className="w-4 h-4" />,
  Static: <StaticIcon className="w-4 h-4" />,
};

const reactionLabels: { [key in CyberpunkReaction]: string } = {
  Glitch: 'Glitch',
  Upload: 'Upload',
  Corrupt: 'Corrupt',
  Rewind: 'Rewind',
  Static: 'Static',
};

const ReactionTooltip: React.FC<ReactionTooltipProps> = ({ postId, reactions, isVisible }) => {
  const [reactionDetails, setReactionDetails] = useState<ReactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !reactions || Object.keys(reactions).length === 0) {
      setReactionDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const result = await postService.getReactionDetails(postId);
        if (result.data?.reactionDetails) {
          setReactionDetails(result.data.reactionDetails);
        }
      } catch (error) {
        console.error('[ReactionTooltip] Error fetching reaction details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [postId, isVisible, reactions]);

  if (!isVisible || !reactions || Object.keys(reactions).length === 0) {
    return null;
  }

  const totalReactions = (Object.values(reactions) as number[]).reduce((sum, count) => sum + count, 0);

  return (
    <div 
      ref={tooltipRef}
      className="reaction-tooltip"
      style={{
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {loading ? (
        <div className="reaction-tooltip-loading">Carregando...</div>
      ) : reactionDetails ? (
        <div className="reaction-tooltip-content">
          {Object.entries(reactions).map(([reactionType, count]) => {
            const detail = reactionDetails[reactionType as CyberpunkReaction];
            if (!detail || detail.count === 0) return null;

            return (
              <div key={reactionType} className="reaction-group">
                <div className="reaction-group-header">
                  <span className="reaction-icon">
                    {reactionIcons[reactionType as CyberpunkReaction]}
                  </span>
                  <span className="reaction-label">
                    {reactionLabels[reactionType as CyberpunkReaction]}
                  </span>
                  <span className="reaction-count">+{count}</span>
                </div>
                <div className="reaction-users">
                  {detail.users.slice(0, 5).map((user) => (
                    <div key={user.id} className="reaction-user">
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                        className="reaction-user-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24?text=?';
                        }}
                      />
                      <span className="reaction-user-name">{user.username}</span>
                    </div>
                  ))}
                  {detail.count > 5 && (
                    <div className="reaction-more">
                      +{detail.count - 5} {detail.count - 5 === 1 ? 'pessoa' : 'pessoas'} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="reaction-tooltip-footer">
            Total: {totalReactions} {totalReactions === 1 ? 'reação' : 'reações'}
          </div>
        </div>
      ) : (
        <div className="reaction-tooltip-empty">Sem reações</div>
      )}
    </div>
  );
};

export default ReactionTooltip;

import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../../types';
import { PlusIcon } from '../../../components/ui/icons';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';

interface AvatarStoryWrapperProps {
    user: User;
    currentUser: User;
    size?: string; // e.g., "w-16 h-16"
    onViewStory?: (user: User) => void;
    onCreateStory?: () => void;
    showName?: boolean; // Option to show username below
}

export default function AvatarStoryWrapper({ 
    user, 
    currentUser, 
    size = "w-16 h-16", 
    onViewStory, 
    onCreateStory,
    showName = false
}: AvatarStoryWrapperProps) {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCurrentUser = user.id === currentUser.id || user.username === currentUser.username;
    // Check for active stories
    const hasStories = user.stories && user.stories.length > 0;
    
    // Check for unseen stories
    // Logic: If any story in the list does NOT have the current user's ID in its viewers list.
    const currentUserId = currentUser.id || currentUser.username; // Fallback
    const hasUnseenStories = hasStories && user.stories!.some(story => {
        const viewers = story.viewers || [];
        return !viewers.includes(currentUserId);
    });

    const avatarShape = user.equippedFrame ? getFrameShape(user.equippedFrame.name) : 'rounded-full';

    // Handle Click Logic
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // 1. Has Stories? -> View Story
        if (hasStories) {
            if (onViewStory) {
                onViewStory(user);
            }
            return;
        }

        // 2. Is Me & No Stories? -> Create Story
        if (isCurrentUser && !hasStories) {
            // Trigger file input or creation flow
            if (fileInputRef.current) {
                fileInputRef.current.click();
            } else if (onCreateStory) {
                onCreateStory();
            }
            return;
        }

        // 3. Fallback -> Go to Profile
        navigate(`/@${user.username}`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // If the user selects a file, we should probably trigger the creator with this file.
        // Since the current architecture relies on StoryCreator modal, 
        // we might just want to call onCreateStory() here if it was passed, 
        // or if we really want to support "direct upload", we would need a new prop.
        // For now, let's call onCreateStory() to open the modal, 
        // as the "Pixel Perfect" prompt was more about the UI/Interaction flow.
        // If strict file input is needed, we would need to pass this file to the modal.
        if (onCreateStory) onCreateStory();
    };

    // Visual State Determination
    let ringClass = "";
    let pulseClass = "";
    
    if (hasStories) {
        if (hasUnseenStories) {
            // New Story: Instagram Gradient with pulse
            // #f09433, #e6683c, #dc2743, #cc2366, #bc1888
            ringClass = "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)] p-[2px]";
            pulseClass = "animate-pulse";
        } else {
            // Seen Story: Light Gray
            ringClass = "bg-[#dbdbdb] dark:bg-gray-600 p-[2px]";
            pulseClass = "";
        }
    } else {
        // No Story: No border (but we need to maintain layout if needed, or just 0 padding)
        // Prompt says "Nenhuma borda externa, apenas a foto".
        ringClass = "p-0";
        pulseClass = "";
    }

    // Gap Class
    // The gap is the space between the ring and the avatar.
    // We simulate this by having a container with the background color (theme bg) inside the ring.
    // If there is a ring (hasStories), we add padding for the gap.
    const gapClass = hasStories ? "bg-[var(--theme-bg-primary)] p-[2px]" : "";

    return (
        <div className={`flex flex-col items-center gap-1 cursor-pointer group ${pulseClass}`} onClick={handleClick}>
            {/* Main Avatar Container */}
            <div className={`relative ${size}`}>
                
                {/* The Ring Container */}
                <div className={`absolute inset-0 ${avatarShape} ${ringClass}`}>
                    {/* The Gap Container */}
                    <div className={`w-full h-full ${avatarShape} ${gapClass} overflow-hidden`}>
                        {/* The Image */}
                        <img 
                            src={user.avatar || 'https://via.placeholder.com/150'} 
                            alt={user.username} 
                            className={`w-full h-full ${avatarShape} object-cover`}
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150'; }}
                        />
                         {/* Effects (retained from original) */}
                         {user.equippedEffect && user.equippedEffect.imageUrl && (
                            <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                <img 
                                    src={user.equippedEffect.imageUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Frame (Overlay) */}
                {user.equippedFrame && (
                    <div className="absolute -inset-1 z-20 pointer-events-none">
                        <FramePreview item={user.equippedFrame} />
                    </div>
                )}
            </div>

            {/* Username */}
            {showName && (
                <span className="text-xs text-[var(--theme-text-secondary)] truncate w-20 text-center">
                    {isCurrentUser ? "Seu Story" : user.username}
                </span>
            )}
        </div>
    );
}

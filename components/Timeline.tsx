

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { formatRelativeDate } from '../utils/date';
import { Post, User, Page } from '../types';
import { CalendarIcon } from './icons';
import CalendarModal from './modals/CalendarModal';
import { useTranslation } from '../hooks/useTranslation';
import FramePreview, { getFrameShape } from './FramePreview';


interface TimelineProps {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    onNavigate: (page: Page, username?: string) => void;
    allPosts: Post[];
    onOpenComposer?: (date: Date) => void;
}

const Timeline: React.FC<TimelineProps> = ({ selectedDate, setSelectedDate, onNavigate, allPosts, onOpenComposer }) => {
    const { t } = useTranslation();
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const today = useMemo(() => new Date(), []);
    const dates = useMemo(() => {
        const dateArray: Date[] = [];
        // Extend range to show more past/future activity
        for (let i = -60; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dateArray.push(date);
        }
        return dateArray;
    }, [today]);

    const postsByDate = useMemo(() => {
        const map = new Map<string, User[]>();
        allPosts.forEach(post => {
            const dateString = post.timestamp.toDateString();
            if (!map.has(dateString)) {
                map.set(dateString, []);
            }
            const users = map.get(dateString)!;
            if (!users.some(u => u.username === post.author.username)) {
                users.push(post.author);
            }
        });
        return map;
    }, [allPosts]);

    const selectedIndex = dates.findIndex(d => d.toDateString() === selectedDate.toDateString());

    useEffect(() => {
        if (isDragging) return; // Don't auto-scroll while user is dragging
        if (timelineRef.current && selectedIndex !== -1) {
            const selectedElement = timelineRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                const scrollLeft = selectedElement.offsetLeft - (timelineRef.current.offsetWidth / 2) + (selectedElement.offsetWidth / 2);
                timelineRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [selectedDate, selectedIndex, isDragging]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - timelineRef.current.offsetLeft);
        setScrollLeft(timelineRef.current.scrollLeft);
        timelineRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeaveOrUp = () => {
        if (!timelineRef.current) return;
        setIsDragging(false);
        timelineRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !timelineRef.current) return;
        e.preventDefault(); // Prevent click event from firing on drag
        const x = e.pageX - timelineRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Multiply for faster scrolling
        timelineRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (timelineRef.current) {
            // Prevent the default vertical scroll behavior
            e.preventDefault();
            // Use deltaY for mouse wheel and deltaX for trackpad horizontal swipe
            const scrollAmount = e.deltaY + e.deltaX;
            timelineRef.current.scrollTo({
                left: timelineRef.current.scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    const handleDateSelectFromCalendar = (date: Date) => {
        setSelectedDate(date);
        setIsCalendarOpen(false);
    }

    return (
        <div className="h-24 bg-[var(--theme-bg-primary)] border-t-2 border-[var(--theme-border-primary)] z-10 flex items-center justify-center p-2 flex-shrink-0 relative">
            <button
                onClick={() => setIsCalendarOpen(true)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-[var(--theme-bg-primary)] text-[var(--theme-primary)] border-2 border-[var(--theme-primary)] rounded-full hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg-primary)] transition-all shadow-lg hover:shadow-[0_0_15px_var(--theme-primary)]"
                title={t('dateJump')}
            >
                <CalendarIcon className="w-6 h-6" />
            </button>

            <div
                ref={timelineRef}
                className="flex items-center space-x-4 overflow-x-auto timeline-scrollbar w-full px-[45%]"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
                onWheel={handleWheel}
            >
                {dates.map((date, index) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const authorsOnDate = postsByDate.get(date.toDateString()) || [];
                    const hasPosts = authorsOnDate.length > 0;

                    return (
                        <div
                            key={index}
                            onClick={() => setSelectedDate(date)}
                             className={`transition-all duration-300 flex-shrink-0 p-2 cursor-pointer flex flex-col items-center group ${
                                isSelected ? 'selected-date-animation' : 'hover:scale-110'
                            }`}
                        >
                            <div className="flex justify-center items-center h-6 mb-1 space-x-[-8px]">
                                {authorsOnDate.slice(0, 3).map(author => {
                                    const avatarShape = author.equippedFrame ? getFrameShape(author.equippedFrame.name) : 'rounded-full';
                                    return (
                                        <div
                                            key={author.username}
                                            className="relative w-6 h-6 flex-shrink-0 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigate(Page.Profile, author.username);
                                            }}
                                            title={`@${author.username}`}
                                        >
                                            <Avatar
                                                src={author.avatar}
                                                username={author.username}
                                                className={`w-full h-full ${avatarShape} border-2 border-[var(--theme-bg-primary)] group-hover:border-[var(--theme-secondary)] transition-all object-cover relative z-0`}
                                            />
                                            {author.equippedEffect && (
                                                <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                                    <img 
                                                        src={author.equippedEffect.imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover animate-pulse-soft"
                                                    />
                                                </div>
                                            )}
                                            {author.equippedFrame && (
                                                <div className="absolute -inset-1 z-20 pointer-events-none">
                                                    <FramePreview item={author.equippedFrame} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {authorsOnDate.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-light)] text-xs flex items-center justify-center border-2 border-[var(--theme-bg-primary)]">
                                        +{authorsOnDate.length - 3}
                                    </div>
                                )}
                            </div>
                            <div className={`text-sm font-bold ${
                                isSelected
                                    ? 'text-[var(--theme-secondary)]'
                                    : 'text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-light)]'
                            }`}>
                                {formatRelativeDate(date)}
                            </div>
                            {isSelected && onOpenComposer && (
                                <button 
                                    className="absolute -top-2 right-0 bg-[var(--theme-secondary)] text-[var(--theme-bg-primary)] rounded-full p-0.5 hover:scale-110 transition-transform shadow-lg z-30"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenComposer(date);
                                    }}
                                    title={t('transmitNewEcho')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            <div className={`h-1 mt-1 w-full transition-colors ${
                                isSelected 
                                ? 'bg-[var(--theme-secondary)]' 
                                : hasPosts 
                                    ? 'bg-[var(--theme-secondary)] opacity-50 group-hover:opacity-100'
                                    : 'bg-[var(--theme-border-primary)]'
                            }`}></div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-1 bg-[var(--theme-secondary)] opacity-50 pointer-events-none"></div>
            
            {isCalendarOpen && (
                <CalendarModal
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelectFromCalendar}
                    onClose={() => setIsCalendarOpen(false)}
                />
            )}
        </div>
    );
};

export default Timeline;
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { formatRelativeDate } from '../../../utils/date';
import { Post, User, Page } from '../../../types/index';
import { CalendarIcon } from '../../../components/ui/icons';
import Avatar from '../../profile/components/Avatar';
import CalendarModal from '../../../components/ui/CalendarModal';
import { useTranslation } from '../../../hooks/useTranslation';
import FramePreview, { getFrameShape } from '../../profile/components/FramePreview';

// Each date cell width in px (content + right gap)
const ITEM_WIDTH = 80;
// Visible height of the list inside the h-24 bar
const LIST_HEIGHT = 80;

interface TimelineProps {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    onNavigate: (page: Page, username?: string) => void;
    allPosts: Post[];
    onOpenComposer?: (date: Date) => void;
}

export default function Timeline({ selectedDate, setSelectedDate, onNavigate, allPosts, onOpenComposer }: TimelineProps) {
    const { t } = useTranslation();
    const listRef = useRef<FixedSizeList>(null);
    const outerRef = useRef<HTMLDivElement>(null);   // react-window outer container
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [containerWidth, setContainerWidth] = useState(600);

    // Measure available width (minus left-button area ~120px)
    const wrapperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!wrapperRef.current) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w) setContainerWidth(Math.floor(w));
        });
        ro.observe(wrapperRef.current);
        return () => ro.disconnect();
    }, []);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const isToday = selectedDate.toDateString() === today.toDateString();

    // ±90 days range — full range kept; virtualization handles render cost
    const dates = useMemo(() => {
        const arr: Date[] = [];
        const rangeStart = -90;
        const rangeEnd = 30;
        for (let i = rangeStart; i <= rangeEnd; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            arr.push(d);
        }

        // Insert selectedDate if it falls outside the base range
        const selStr = selectedDate.toDateString();
        const inRange = arr.some(d => d.toDateString() === selStr);
        if (!inRange) {
            const offset = Math.round((selectedDate.getTime() - today.getTime()) / 86400000);
            const d = new Date(today);
            d.setDate(today.getDate() + offset);
            if (offset < rangeStart) arr.unshift(d);
            else arr.push(d);
        }
        return arr;
    }, [today, selectedDate]);

    const postsByDate = useMemo(() => {
        const map = new Map<string, User[]>();
        allPosts.forEach(post => {
            const key = new Date(post.timestamp).toDateString();
            if (!map.has(key)) map.set(key, []);
            const users = map.get(key)!;
            if (!users.some(u => u.username === post.author?.username)) {
                users.push(post.author);
            }
        });
        return map;
    }, [allPosts]);

    const selectedIndex = dates.findIndex(d => d.toDateString() === selectedDate.toDateString());

    // Scroll the virtualised list to centre the selected date
    useEffect(() => {
        if (selectedIndex === -1 || !listRef.current) return;
        listRef.current.scrollToItem(selectedIndex, 'center');
    }, [selectedIndex]);

    // Drag-to-scroll on the react-window outer container
    const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const el = outerRef.current;
        if (!el) return;
        dragState.current = { dragging: true, startX: e.pageX, scrollLeft: el.scrollLeft };
        el.style.cursor = 'grabbing';
    }, []);

    const onMouseUp = useCallback(() => {
        dragState.current.dragging = false;
        if (outerRef.current) outerRef.current.style.cursor = 'grab';
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragState.current.dragging || !outerRef.current) return;
        e.preventDefault();
        const walk = (e.pageX - dragState.current.startX) * 1.5;
        outerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        if (!outerRef.current) return;
        e.preventDefault();
        outerRef.current.scrollLeft += e.deltaY + e.deltaX;
    }, []);

    // Render a single date cell
    const DateCell = useCallback(({ index, style }: ListChildComponentProps) => {
        const date = dates[index];
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const authorsOnDate = postsByDate.get(date.toDateString()) || [];
        const hasPosts = authorsOnDate.length > 0;

        return (
            <div
                style={style}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 p-2 cursor-pointer flex flex-col items-center group relative transition-all duration-200 ${
                    isSelected ? 'selected-date-animation' : 'hover:scale-105'
                }`}
            >
                {/* Mini avatars */}
                <div className="flex justify-center items-center h-6 mb-1" style={{ gap: '-8px' }}>
                    {authorsOnDate.slice(0, 3).map(author => {
                        const avatarShape = author.equippedFrame ? getFrameShape(author.equippedFrame.name) : 'rounded-full';
                        return (
                            <div
                                key={author.username}
                                className="relative w-6 h-6 flex-shrink-0 -ml-1 first:ml-0"
                                onClick={e => { e.stopPropagation(); onNavigate(Page.Profile, author.username); }}
                                title={`@${author.username}`}
                            >
                                <Avatar
                                    src={author.avatar}
                                    username={author.username}
                                    width={24}
                                    height={24}
                                    className={`w-full h-full ${avatarShape} border-2 border-[var(--theme-bg-primary)] group-hover:border-[var(--theme-secondary)] transition-all object-cover`}
                                />
                                {author.equippedEffect && (
                                    <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-60 ${avatarShape} overflow-hidden`}>
                                        <img src={author.equippedEffect.imageUrl} alt="" className="w-full h-full object-cover animate-pulse-soft" width={24} height={24} />
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
                        <div className="w-6 h-6 rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-light)] text-xs flex items-center justify-center border-2 border-[var(--theme-bg-primary)] -ml-1">
                            +{authorsOnDate.length - 3}
                        </div>
                    )}
                </div>

                {/* Label */}
                <div className={`text-sm font-bold whitespace-nowrap ${
                    isSelected ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-light)]'
                }`}>
                    {formatRelativeDate(date)}
                </div>

                {/* Composer shortcut */}
                {isSelected && onOpenComposer && (
                    <button
                        className="absolute -top-2 right-0 bg-[var(--theme-secondary)] text-[var(--theme-bg-primary)] rounded-full p-0.5 hover:scale-110 transition-transform shadow-lg z-30"
                        onClick={e => { e.stopPropagation(); onOpenComposer(date); }}
                        title={t('transmitNewEcho')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}

                {/* Activity indicator bar */}
                <div className={`h-1 mt-1 w-full rounded transition-colors ${
                    isSelected
                        ? 'bg-[var(--theme-secondary)]'
                        : hasPosts
                            ? 'bg-[var(--theme-secondary)] opacity-50 group-hover:opacity-100'
                            : 'bg-[var(--theme-border-primary)]'
                }`} />
            </div>
        );
    }, [dates, selectedDate, postsByDate, setSelectedDate, onNavigate, onOpenComposer, t]);

    return (
        <div className="h-24 bg-[var(--theme-bg-primary)] border-t-2 border-[var(--theme-border-primary)] z-10 flex items-center p-2 flex-shrink-0 relative">
            {/* Left controls */}
            <div className="flex items-center gap-2 flex-shrink-0 z-30 mr-2">
                <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="p-3 bg-[var(--theme-bg-primary)] text-[var(--theme-primary)] border-2 border-[var(--theme-primary)] rounded-full hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg-primary)] transition-all shadow-lg hover:shadow-[0_0_15px_var(--theme-primary)]"
                    title={t('dateJump')}
                >
                    <CalendarIcon className="w-6 h-6" />
                </button>

                {!isToday && (
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--theme-primary)] text-white rounded-full shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                        title="Voltar para hoje"
                    >
                        Hoje
                    </button>
                )}
            </div>

            {/* Virtualised date list */}
            <div
                ref={wrapperRef}
                className="flex-1 min-w-0"
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onMouseMove={onMouseMove}
                onWheel={onWheel}
            >
                <FixedSizeList
                    ref={listRef}
                    outerRef={outerRef}
                    layout="horizontal"
                    width={containerWidth}
                    height={LIST_HEIGHT}
                    itemCount={dates.length}
                    itemSize={ITEM_WIDTH}
                    style={{ cursor: 'grab', overflowX: 'auto', overflowY: 'hidden' }}
                    className="timeline-scrollbar"
                >
                    {DateCell}
                </FixedSizeList>
            </div>

            {isCalendarOpen && (
                <CalendarModal
                    selectedDate={selectedDate}
                    onDateSelect={date => { setSelectedDate(date); setIsCalendarOpen(false); }}
                    onClose={() => setIsCalendarOpen(false)}
                />
            )}
        </div>
    );
}

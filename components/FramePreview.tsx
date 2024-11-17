import React from 'react';
import { Item } from '../types';

interface FramePreviewProps {
    item: Item;
}

export function getFrameShape(frameName: string): string {
    switch (frameName) {
        case 'Neon Demon':
        case 'Golden Legend':
        case 'Holo Glitch':
        case 'Gold Trim':
        case 'Void Walker':
        case 'Cosmic Stardust':
        case 'Cyber Pulse':
        case 'Golden Halo':
            return 'rounded-full';
        case 'Retro TV':
            return 'rounded-2xl';
        case 'Neon Punk':
            return 'rounded-lg';
        case 'Cyber Samurai':
            return 'rounded-sm';
        case 'Retro Arcade':
        case 'Glitch Border':
        case 'Matrix Code':
        case 'Glitch Horror':
        case 'Crystal Shard':
        case 'Pixel Heart':
        default:
            return 'rounded-none';
    }
};

function FramePreview({ item }: FramePreviewProps) {
    // Custom CSS implementations for specific frames
    if (item.name === 'Pixel Heart') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-red-500 shadow-[0_0_5px_#ef4444]" style={{ imageRendering: 'pixelated' }}>
                 <div className="absolute top-0 right-0 w-3 h-3 bg-red-500"></div>
            </div>
        );
    }
    if (item.name === 'Retro Arcade') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-dashed border-green-400 shadow-[0_0_5px_#4ade80]" style={{ imageRendering: 'pixelated' }}></div>
        );
    }
    if (item.name === 'Neon Demon') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-[3px] border-purple-500 shadow-[0_0_10px_#a855f7,inset_0_0_5px_#ec4899] animate-pulse"></div>
        );
    }
    if (item.name === 'Glitch Border') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-2 border-red-500 shadow-[-2px_0_#00ffff,2px_0_#ff00ff] animate-pulse" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 5% 100%, 0 85%)' }}></div>
        );
    }
    if (item.name === 'Golden Legend') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-4 border-yellow-400 shadow-[0_0_10px_#facc15] bg-gradient-to-tr from-yellow-300/20 to-yellow-600/20"></div>
        );
    }
    if (item.name === 'Cyber Samurai') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-[3px] border-red-600 shadow-[0_0_5px_#ef4444] rounded-sm" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)' }}>
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-red-500"></div>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-red-500"></div>
            </div>
        );
    }
    if (item.name === 'Holo Glitch') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-2 border-cyan-400 shadow-[0_0_10px_#22d3ee,inset_0_0_5px_#22d3ee] animate-pulse">
                <div className="absolute inset-0 border border-blue-500 rounded-full opacity-50 animate-ping"></div>
            </div>
        );
    }
    if (item.name === 'Gold Trim') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-[3px] border-yellow-500 ring-2 ring-yellow-200 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
        );
    }
    if (item.name === 'Neon Punk') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-lg border-2 border-pink-500 shadow-[0_0_5px_#ec4899,0_0_10px_#ec4899] animate-pulse">
                <div className="absolute -inset-1 border border-purple-500 rounded-xl opacity-70"></div>
            </div>
        );
    }
    if (item.name === 'Matrix Code') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-2 border-green-500 shadow-[0_0_4px_#22c55e]" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)', backgroundSize: '10px 10px' }}></div>
        );
    }
    if (item.name === 'Void Walker') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-2 border-purple-900 shadow-[0_0_10px_#581c87,inset_0_0_10px_#000000] bg-black/20"></div>
        );
    }
    if (item.name === 'Retro TV') {
        return (
             <div className="absolute inset-0 z-20 pointer-events-none rounded-2xl border-4 border-gray-700 shadow-inner">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
             </div>
        );
    }
    if (item.name === 'Cosmic Stardust') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full p-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow">
                <div className="absolute inset-0 rounded-full bg-transparent border-2 border-white/20"></div>
            </div>
        );
    }
    if (item.name === 'Cyber Pulse') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse">
                <div className="absolute inset-0 rounded-full border border-cyan-300 opacity-50 scale-110"></div>
            </div>
        );
    }
    if (item.name === 'Golden Halo') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-4 border-yellow-300 shadow-[0_0_10px_#fde047] ring-2 ring-yellow-500/30">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-full h-4 bg-gradient-to-t from-yellow-300/50 to-transparent blur-md"></div>
            </div>
        );
    }
    if (item.name === 'Glitch Horror') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-2 border-red-600 shadow-[0_0_5px_#dc2626] animate-pulse" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 20%, 5% 20%, 5% 10%, 0% 10%)' }}>
                <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay"></div>
            </div>
        );
    }
    if (item.name === 'Crystal Shard') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none border-4 border-blue-200 shadow-[0_0_10px_#bfdbfe] bg-gradient-to-br from-white/30 to-blue-500/30 backdrop-blur-[1px]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
        );
    }
    if (item.name === 'Pixel Heart') {
        return (
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full border-4 border-pink-500 shadow-[0_0_5px_#ec4899]" style={{ imageRendering: 'pixelated', borderStyle: 'dashed' }}>
                 <div className="absolute -top-1 -right-1 text-xl animate-bounce">❤️</div>
            </div>
        );
    }

    // Fallback for other frames
    return (
        <img 
            src={item.imageUrl} 
            alt="" // Empty alt to prevent text overlay on broken image
            className="absolute inset-0 w-full h-full pointer-events-none z-20 scale-110 object-contain"
            onError={(e) => {
                // If image fails, hide it completely
                e.currentTarget.style.display = 'none'; 
            }}
        />
    );
};

export default FramePreview;

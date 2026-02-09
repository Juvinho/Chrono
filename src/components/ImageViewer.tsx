import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  alt?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ 
  isOpen, 
  imageUrl, 
  onClose, 
  alt = 'Image' 
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handler functions
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev + 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(1, prev - 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl, isOpen]);

  // Add wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      setZoom(prev => Math.max(1, Math.min(5, prev + delta)));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      }
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-all"
          title="Close (ESC)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-black bg-opacity-70 p-4 rounded-lg backdrop-blur-sm">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-all"
            title="Zoom out (-)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="flex items-center gap-2 px-3 border-l border-r border-white border-opacity-20">
            <span className="text-white text-sm font-medium w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-all"
            title="Zoom in (+)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="11" y1="8" x2="11" y2="14" />
            </svg>
          </button>

          <button
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-40 rounded text-white transition-all"
            title="Reset (R)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <img
          src={imageUrl}
          alt={alt}
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s',
            maxWidth: '95vw',
            maxHeight: '95vh',
            objectFit: 'contain',
            userSelect: 'none',
          }}
          draggable={false}
        />

        {/* Info Text */}
        <div className="absolute top-4 left-4 z-20 text-white text-xs opacity-60">
          <p>🔍 Scroll/+- para zoom • 🖱️ Arrasta para mover • Clica para fechar</p>
        </div>
      </div>
    </div>
  );
};

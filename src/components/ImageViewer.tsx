import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  FC
} from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  alt?: string;
}

const ImageViewerContent: FC<ImageViewerProps> = ({ 
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
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handler functions with useCallback to prevent unnecessary recreations
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

  // Reset when opening
  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [isOpen, imageUrl]);

  // Manage body scroll and cleanup
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Wheel and keyboard events
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Throttle wheel events to prevent excessive updates
      if (wheelTimeoutRef.current) return;
      
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      setZoom(prev => Math.max(1, Math.min(5, prev + delta)));
      
      wheelTimeoutRef.current = setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 50);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false } as AddEventListenerOptions);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = null;
      }
    };
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1 && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, zoom, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getCursor = useMemo(() => {
    if (zoom > 1) return isDragging ? 'grabbing' : 'grab';
    return 'pointer';
  }, [zoom, isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 overflow-hidden"
      onClick={onClose}
      style={{ 
        backdropFilter: 'blur(4px)',
      }}
    >
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center select-none"
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: getCursor,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[10000] w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/75 rounded-full text-white transition-colors"
          title="Fechar (ESC)"
          aria-label="Close image viewer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 z-[10000] flex gap-2 bg-black/80 p-4 rounded-lg backdrop-blur-md transform -translate-x-1/2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Reduzir zoom (-)"
            aria-label="Zoom out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="flex items-center gap-2 px-3 border-l border-r border-white/20">
            <span className="text-white text-sm font-medium w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Ampliar zoom (+)"
            aria-label="Zoom in"
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
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded text-white transition-colors"
            title="Reset (R)"
            aria-label="Reset zoom"
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
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            maxWidth: '95vw',
            maxHeight: '95vh',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          }}
          draggable={false}
          loading="lazy"
        />

        {/* Info Text */}
        <div className="absolute top-4 left-4 z-[10000] text-white text-xs opacity-60 pointer-events-none">
          <p>🔍 Scroll/+- zoom • 🖱️ Arrasta • ESC fecha</p>
        </div>
      </div>
    </div>
  );
};

// Main component using Portal to render outside of main DOM
export const ImageViewer: FC<ImageViewerProps> = (props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <ImageViewerContent {...props} />,
    document.body
  );
};

export default React.memo(ImageViewer);

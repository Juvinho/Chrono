import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // width / height
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  isCircular?: boolean; // For avatars
}

export function ImageCropper({ imageSrc, aspectRatio, onCrop, onCancel, isCircular = false }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop area dimensions
  // Use higher resolution for output, but display it smaller
  const DISPLAY_WIDTH = 300;
  const DISPLAY_HEIGHT = DISPLAY_WIDTH / aspectRatio;
  
  // Output resolution
  const OUTPUT_WIDTH = isCircular ? 400 : 1200;
  const OUTPUT_HEIGHT = OUTPUT_WIDTH / aspectRatio;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    // Calculate scale to cover the display area
    const scaleToCoverWidth = DISPLAY_WIDTH / naturalWidth;
    const scaleToCoverHeight = DISPLAY_HEIGHT / naturalHeight;
    
    // To ensure the crop area is fully filled, we need the larger of the two scales
    const coverScale = Math.max(scaleToCoverWidth, scaleToCoverHeight);
    
    // Set initial zoom to this cover scale so the user sees the whole image (or as much as fits)
    setZoom(coverScale);
    setMinZoom(coverScale); // Prevent zooming out to black bars
    setMaxZoom(Math.max(3, coverScale * 5)); 
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
  };
  
  // Also support touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
       setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  }

  const handleSave = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    
    // Scale factor between display and output
    const scale = OUTPUT_WIDTH / DISPLAY_WIDTH;

    // 1. Translate to center of canvas
    ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
    // 2. Scale (zoom * resolution scale)
    ctx.scale(zoom * scale, zoom * scale);
    // 3. Translate based on user drag (position is in display pixels, so divided by zoom it remains consistent)
    ctx.translate(position.x / zoom, position.y / zoom);
    // 4. Draw image centered at 0,0
    ctx.drawImage(imageRef.current, -imageRef.current.naturalWidth / 2, -imageRef.current.naturalHeight / 2);
    
    // Use JPEG with 0.9 quality to reduce size
    onCrop(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-[#1a1a1a] p-6 rounded-lg max-w-lg w-full flex flex-col items-center border border-[#333]">
        <h3 className="text-white text-lg font-bold mb-4">Crop Image</h3>
        
        <div 
          ref={containerRef}
          className="relative w-full h-80 bg-[#000] overflow-hidden cursor-move mb-4 border border-[#333]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
            {/* The Image */}
            <div 
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <img 
                    ref={imageRef}
                    src={imageSrc} 
                    alt="Crop target" 
                    className="max-w-none"
                    draggable={false}
                    onLoad={handleImageLoad}
                />
            </div>
            
            {/* The Overlay/Mask */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                    style={{
                        width: DISPLAY_WIDTH,
                        height: DISPLAY_HEIGHT,
                        borderRadius: isCircular ? '50%' : '0',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                        border: '2px solid white'
                    }}
                ></div>
            </div>
        </div>
        
        <div className="w-full flex items-center space-x-4 mb-6">
            <span className="text-gray-400 text-sm">-</span>
            <input 
                type="range" 
                min={minZoom} 
                max={maxZoom} 
                step={0.01} 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#8A2BE2]"
            />
            <span className="text-gray-400 text-sm">+</span>
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 rounded bg-[#8A2BE2] text-white hover:bg-[#7a25c9] transition-colors font-bold"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

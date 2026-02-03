export const generateInitialsAvatar = (username: string, size: number = 200): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    if (!context) {
        return '';
    }

    // Generate a consistent color based on the username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Vibrant colors palette (Cyberpunk-ish or just nice UI colors)
    const colors = [
        '#FF5252', // Red
        '#FF4081', // Pink
        '#E040FB', // Purple
        '#7C4DFF', // Deep Purple
        '#536DFE', // Indigo
        '#448AFF', // Blue
        '#40C4FF', // Light Blue
        '#18FFFF', // Cyan
        '#64FFDA', // Teal
        '#69F0AE', // Green
        '#B2FF59', // Light Green
        '#EEFF41', // Lime
        '#FFFF00', // Yellow
        '#FFD740', // Amber
        '#FFAB40', // Orange
        '#FF6E40'  // Deep Orange
    ];
    
    const colorIndex = Math.abs(hash) % colors.length;
    const backgroundColor = colors[colorIndex];

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, size, size);

    // Draw initials
    const initials = username.slice(0, 2).toUpperCase();
    context.fillStyle = '#FFFFFF';
    context.font = `bold ${size * 0.5}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add a slight shadow for better visibility
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    context.fillText(initials, size / 2, size / 2);

    return canvas.toDataURL('image/png');
};

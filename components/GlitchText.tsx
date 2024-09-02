
import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

const GlitchText: React.FC<GlitchTextProps> = ({ text, className }) => {
  return (
    <div data-text={text} className={`glitch-effect ${className}`}>
      {text}
    </div>
  );
};

export default GlitchText;

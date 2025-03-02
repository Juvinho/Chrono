
import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export default function GlitchText({ text, className }: GlitchTextProps) {
  return (
    <div data-text={text} className={`glitch-effect ${className}`}>
      {text}
    </div>
  );
}

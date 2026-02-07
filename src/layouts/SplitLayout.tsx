import React, { ReactNode } from 'react';
import './split-layout.css';

interface SplitLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  leftWidth?: string;
  rightWidth?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftContent,
  rightContent,
  leftWidth = '50%',
  rightWidth = '50%'
}) => {
  return (
    <div className="split-layout-container">
      <div
        className="split-layout-left"
        style={{ width: leftWidth }}
      >
        {leftContent}
      </div>

      <div
        className="split-layout-right"
        style={{ width: rightWidth }}
      >
        {rightContent}
      </div>
    </div>
  );
};

import React, { ReactNode } from 'react';
import './split-layout.css';

interface SplitLayoutProps {
  /**
   * Conteúdo do lado esquerdo (Feed, Perfil, etc)
   */
  leftContent: ReactNode;

  /**
   * Conteúdo do lado direito (Mensagens)
   */
  rightContent: ReactNode;

  /**
   * Largura do lado esquerdo (default: '50%')
   */
  leftWidth?: string;

  /**
   * Largura do lado direito (default: '50%')
   */
  rightWidth?: string;

  /**
   * Altura total (default: 'calc(100vh - 70px)')
   */
  height?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftContent,
  rightContent,
  leftWidth = '50%',
  rightWidth = '50%',
  height = 'calc(100vh - 70px)',
}: SplitLayoutProps) => {
  return (
    <div className="split-layout-container" style={{ height }}>
      {/* LADO ESQUERDO - Feed/Conteúdo */}
      <div className="split-layout-panel split-layout-left" style={{ width: leftWidth }}>
        <div className="split-layout-content">{leftContent}</div>
      </div>

      {/* DIVISÓRIA VISUAL */}
      <div className="split-layout-divider" />

      {/* LADO DIREITO - Mensagens */}
      <div className="split-layout-panel split-layout-right" style={{ width: rightWidth }}>
        <div className="split-layout-content">{rightContent}</div>
      </div>
    </div>
  );
};

import React from 'react';

interface ErrorPageProps {
  onNavigate?: () => void;
}

export const Error404: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-[var(--theme-primary)]">404</h1>
      <h2 className="text-4xl font-bold glitch-effect text-[var(--theme-text-light)]">TIMELINE DESAPARECIDA</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        A timeline que você procura está em outra dimensão. Talvez o Dr. Who saiba onde está...
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-[var(--theme-primary)] text-[var(--theme-bg-primary)] rounded font-bold hover:brightness-110 transition-all text-lg"
      >
        VOLTAR À REALIDADE
      </button>
    </div>
  </div>
);

export const Error500: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-red-500 animate-pulse">500</h1>
      <h2 className="text-4xl font-bold text-red-400">COLAPSO EXISTENCIAL</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        Nossos servidores estão tendo uma crise de identidade. Não sabem mais quem são. Deixa eles tomar um café...
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-red-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
      >
        IGNORAR E CONTINUAR
      </button>
    </div>
  </div>
);

export const Error403: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-orange-500">🔒</h1>
      <h2 className="text-4xl font-bold text-orange-400">ACESSO PROIBIDO</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        Desculpe, agente. Você não tem clearance para acessar isso. Talvez o presidente da KFC tenha...
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-orange-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
      >
        VOLTAR PARA ZONA SEGURA
      </button>
    </div>
  </div>
);

export const Error429: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-yellow-500">⚡</h1>
      <h2 className="text-4xl font-bold text-yellow-400">MUITO RÁPIDO, GUERREIRO!</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        Você está enviando muitos requests. Nem o Flash é tão rápido assim! Respire fundo e tente novamente...
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-yellow-600 text-black rounded font-bold hover:brightness-110 transition-all text-lg font-bold"
      >
        RESPIRAR E TENTAR NOVAMENTE
      </button>
    </div>
  </div>
);

export const Error503: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-purple-500">🚀</h1>
      <h2 className="text-4xl font-bold text-purple-400">SERVIÇO INDISPONÍVEL</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        Estamos em manutenção. Nossos devs estão tomando café e reconfigurando o universo. Volte em breve!
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-purple-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
      >
        CHECKAR MAIS TARDE
      </button>
    </div>
  </div>
);

export const ErrorTimeout: React.FC<ErrorPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
    <div className="text-center space-y-6 max-w-md">
      <h1 className="text-8xl font-bold text-blue-500">⏱️</h1>
      <h2 className="text-4xl font-bold text-blue-400">TIMEOUT</h2>
      <p className="text-lg text-[var(--theme-text-secondary)]">
        A conexão levou TÃO tempo que caducou. Nossos servidores andam meio devagar. Tipo uma tartaruga em um concurso de velocidade.
      </p>
      <button
        onClick={onNavigate}
        className="px-8 py-3 bg-blue-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
      >
        TENTAR OUTRA VEZ (RÁPIDO!)
      </button>
    </div>
  </div>
);

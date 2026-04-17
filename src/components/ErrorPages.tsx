import React from 'react';

interface ErrorPageProps {
  onNavigate?: () => void;
}

const ECHO_SPAM_TIMEOUT_KEY = 'chrono_echo_spam_timeout_until_v1';
const LINK_COPY_SPAM_TIMEOUT_KEY = 'chrono_link_copy_spam_timeout_until_v1';
const POST_SPAM_TIMEOUT_KEY = 'chrono_post_spam_timeout_until_v1';
const POST_SPAM_TIMEOUT_LEVEL_KEY = 'chrono_post_spam_timeout_level_v1';
const POST_SPAM_TIMEOUT_LABELS = ['1 hora', '2 horas', '6 horas', '12 horas', '24 horas'];

const formatRemaining = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

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

export const Error504Echo: React.FC<ErrorPageProps> = ({ onNavigate }) => {
  const [remainingMs, setRemainingMs] = React.useState(0);

  React.useEffect(() => {
    const updateRemaining = () => {
      try {
        const raw = localStorage.getItem(ECHO_SPAM_TIMEOUT_KEY);
        const until = raw ? parseInt(raw, 10) : 0;
        if (!until || Number.isNaN(until)) {
          setRemainingMs(0);
          return;
        }
        const remaining = Math.max(0, until - Date.now());
        setRemainingMs(remaining);
      } catch {
        setRemainingMs(0);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isLocked = remainingMs > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-8xl font-bold text-red-500">504</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-red-400">Erro 504: Eu te falei que não era para clicar muitas vezes</h2>
        <p className="text-lg text-[var(--theme-text-secondary)]">
          {isLocked
            ? `Timeout ativo por 1 hora. Tempo restante: ${formatRemaining(remainingMs)}`
            : 'Timeout encerrado. Você já pode voltar ao EchoFrame.'}
        </p>
        <button
          onClick={onNavigate}
          className="px-8 py-3 bg-red-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
        >
          {isLocked ? 'VOLTAR E REFLETIR' : 'VOLTAR AO ECHOFRAME'}
        </button>
      </div>
    </div>
  );
};

export const Error505LinkCopy: React.FC<ErrorPageProps> = ({ onNavigate }) => {
  const [remainingMs, setRemainingMs] = React.useState(0);

  React.useEffect(() => {
    const updateRemaining = () => {
      try {
        const raw = localStorage.getItem(LINK_COPY_SPAM_TIMEOUT_KEY);
        const until = raw ? parseInt(raw, 10) : 0;
        if (!until || Number.isNaN(until)) {
          setRemainingMs(0);
          return;
        }
        const remaining = Math.max(0, until - Date.now());
        setRemainingMs(remaining);
      } catch {
        setRemainingMs(0);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isLocked = remainingMs > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-8xl font-bold text-red-500">505</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-red-400">Erro 505 - Eu já falei que tava copiado, né?</h2>
        <p className="text-lg text-[var(--theme-text-secondary)]">
          {isLocked
            ? `Timeout ativo por 1 hora para copiar link. Tempo restante: ${formatRemaining(remainingMs)}`
            : 'Timeout encerrado. Você já pode copiar links novamente.'}
        </p>
        <button
          onClick={onNavigate}
          className="px-8 py-3 bg-red-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
        >
          {isLocked ? 'VOLTAR E COMPARTILHAR DIREITO' : 'VOLTAR AO ECHOFRAME'}
        </button>
      </div>
    </div>
  );
};

export const Error507Post: React.FC<ErrorPageProps> = ({ onNavigate }) => {
  const [remainingMs, setRemainingMs] = React.useState(0);
  const [timeoutLevel, setTimeoutLevel] = React.useState(0);

  React.useEffect(() => {
    const updateRemaining = () => {
      try {
        const rawUntil = localStorage.getItem(POST_SPAM_TIMEOUT_KEY);
        const rawLevel = localStorage.getItem(POST_SPAM_TIMEOUT_LEVEL_KEY);
        const until = rawUntil ? parseInt(rawUntil, 10) : 0;
        const level = rawLevel ? parseInt(rawLevel, 10) : 0;
        const maxLevel = POST_SPAM_TIMEOUT_LABELS.length - 1;

        setTimeoutLevel(Number.isNaN(level) ? 0 : Math.min(Math.max(level, 0), maxLevel));

        if (!until || Number.isNaN(until)) {
          setRemainingMs(0);
          return;
        }

        const remaining = Math.max(0, until - Date.now());
        setRemainingMs(remaining);
      } catch {
        setRemainingMs(0);
        setTimeoutLevel(0);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isLocked = remainingMs > 0;
  const maxLevel = POST_SPAM_TIMEOUT_LABELS.length - 1;
  const isMaxTimeout = timeoutLevel >= maxLevel;
  const title = isMaxTimeout
    ? 'Erro 507-2: Quer saber, passa amanhã, porque hoje você vai ficar quietinho.'
    : 'Erro 507, Pronto, te censurei, satisfeito?';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-4">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-8xl font-bold text-red-500">507</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-red-400">{title}</h2>
        <p className="text-lg text-[var(--theme-text-secondary)]">
          {isLocked
            ? `Timeout ativo por ${POST_SPAM_TIMEOUT_LABELS[timeoutLevel]}. Tempo restante: ${formatRemaining(remainingMs)}`
            : 'Timeout encerrado. Você já pode postar novamente.'}
        </p>
        <button
          onClick={onNavigate}
          className="px-8 py-3 bg-red-600 text-white rounded font-bold hover:brightness-110 transition-all text-lg"
        >
          {isLocked ? 'VOLTAR E REFLETIR' : 'VOLTAR AO ECHOFRAME'}
        </button>
      </div>
    </div>
  );
};

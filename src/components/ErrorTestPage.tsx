import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ErrorTestPage: React.FC = () => {
  const navigate = useNavigate();

  const errors = [
    { code: '404', name: 'Timeline Desaparecida', path: '/error/404', color: 'text-red-500' },
    { code: '500', name: 'Colapso Existencial', path: '/error/500', color: 'text-red-600' },
    { code: '403', name: 'Acesso Proibido', path: '/error/403', color: 'text-orange-500' },
    { code: '429', name: 'Muito Rápido!', path: '/error/429', color: 'text-yellow-500' },
    { code: '503', name: 'Serviço Indisponível', path: '/error/503', color: 'text-purple-500' },
    { code: 'TIMEOUT', name: 'Timeout', path: '/error/timeout', color: 'text-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-6xl font-bold mb-4 text-[var(--theme-primary)]">🧪 LABORATÓRIO DE ERROS</h1>
        <p className="text-xl text-[var(--theme-text-secondary)] mb-12">
          Clique em qualquer erro para ver a mensagem engraçada!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {errors.map((error) => (
            <button
              key={error.code}
              onClick={() => navigate(error.path)}
              className="p-6 bg-[var(--theme-bg-secondary)] border-2 border-[var(--theme-border-primary)] rounded-lg hover:border-[var(--theme-primary)] transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className={`text-5xl font-bold mb-4 ${error.color}`}>
                {error.code}
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[var(--theme-text-light)]">
                {error.name}
              </h2>
              <p className="text-sm text-[var(--theme-text-secondary)]">
                Clique para ver a página de erro
              </p>
            </button>
          ))}
        </div>

        <div className="mt-16 p-8 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg">
          <h3 className="text-2xl font-bold mb-4 text-[var(--theme-primary)]">📝 Sobre</h3>
          <p className="text-[var(--theme-text-secondary)]">
            Esta é uma página de teste para visualizar as diferentes páginas de erro da aplicação. 
            Cada erro tem sua própria página com mensagens criativas e engraçadas. Use para testar 
            o UI/UX das páginas de erro!
          </p>
        </div>
      </div>
    </div>
  );
};

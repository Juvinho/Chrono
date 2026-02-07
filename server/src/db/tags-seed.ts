/**
 * Tag Definitions Seed - Initial 5 MVP Tags
 * Run once at startup to ensure tags exist in database
 */

export const TAGS_SEED = [
  // COMPORTAMENTO POSITIVO - Verificado
  {
    id: '00000000-0000-0000-0000-000000000001',
    nome: 'Verificado',
    cor_hex: '#E74C3C',
    cor_border: '#A93226',
    icone: '✓',
    prioridade_exibicao: 10,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: {
      verificado: true,
      manual: true
    },
    condicao_remocao: {
      manual: true
    },
    descricao_publica: 'Identidade confirmada pela Chrono',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // TEMPO E ENGAJAMENTO - Recém-chegado
  {
    id: '00000000-0000-0000-0000-000000000002',
    nome: 'Recém-chegado',
    cor_hex: '#AED6F1',
    cor_border: '#5DADE2',
    icone: '🌱',
    prioridade_exibicao: 5,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: {
      tempo_desde_criacao: '<= 7 dias'
    },
    condicao_remocao: {
      tempo_desde_criacao: '> 7 dias'
    },
    descricao_publica: 'Novo na Chrono',
    notificar_aquisicao: false,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // COMPORTAMENTO POSITIVO - Popular
  {
    id: '00000000-0000-0000-0000-000000000003',
    nome: 'Popular',
    cor_hex: '#FF6B9D',
    cor_border: '#C7385F',
    icone: '⭐',
    prioridade_exibicao: 5,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: {
      total_reacoes_recebidas: '>= 5000'
    },
    condicao_remocao: null,
    descricao_publica: 'Conteúdo amplamente apreciado',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // SEGURANÇA E MODERAÇÃO - Advertido
  {
    id: '00000000-0000-0000-0000-000000000004',
    nome: 'Advertido',
    cor_hex: '#F39C12',
    cor_border: '#B8790A',
    icone: '⚠️',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: {
      avisos_oficiais: '>= 1'
    },
    condicao_remocao: {
      apos_dias_sem_infracoes: 60
    },
    descricao_publica: 'Recebeu aviso oficial',
    descricao_interna: 'Usuário foi advertido por violar regras da comunidade',
    notificar_aquisicao: true,
    notificar_remocao: true,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // SEGURANÇA E MODERAÇÃO - Silenciado
  {
    id: '00000000-0000-0000-0000-000000000005',
    nome: 'Silenciado',
    cor_hex: '#34495E',
    cor_border: '#1C2833',
    icone: '🔇',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: {
      tempo_silenciamento_ativo: '> timestamp_atual'
    },
    condicao_remocao: {
      tempo_silenciamento_expirado: true
    },
    descricao_publica: 'Permissões de postagem temporariamente restritas',
    descricao_interna: 'Usuário está em suspensão temporária de postagens',
    notificar_aquisicao: true,
    notificar_remocao: true,
    criado_em: new Date(),
    atualizado_em: new Date()
  }
];

export const TAG_IDS = {
  VERIFICADO: '00000000-0000-0000-0000-000000000001',
  RECEM_CHEGADO: '00000000-0000-0000-0000-000000000002',
  POPULAR: '00000000-0000-0000-0000-000000000003',
  ADVERTIDO: '00000000-0000-0000-0000-000000000004',
  SILENCIADO: '00000000-0000-0000-0000-000000000005'
};

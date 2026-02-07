/**
 * Tag Definitions Seed - 21 Complete Behavioral Tags
 * Categories: positive (5), moderation (5), time (5), style (6)
 * Run once at startup to ensure tags exist in database
 */

export const TAGS_SEED = [
  // ============================================================================
  // COMPORTAMENTO POSITIVO (5 tags)
  // ============================================================================

  {
    id: '00000000-0000-0000-0000-000000000001',
    nome: 'Verificado',
    cor_hex: '#E74C3C',
    cor_border: '#A93226',
    icone: '✓',
    prioridade_exibicao: 10,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: { verificado: true, manual: true },
    condicao_remocao: { manual: true },
    descricao_publica: 'Identidade confirmada pela Chrono',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000003',
    nome: 'Popular',
    cor_hex: '#FF6B9D',
    cor_border: '#C7385F',
    icone: '⭐',
    prioridade_exibicao: 9,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: { total_reacoes_recebidas: '>= 5000' },
    condicao_remocao: null,
    descricao_publica: 'Conteúdo amplamente apreciado pela comunidade',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000006',
    nome: 'Mentor',
    cor_hex: '#9B59B6',
    cor_border: '#6C3483',
    icone: '🎓',
    prioridade_exibicao: 8,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: { posts_educacionais: '>= 50', engajamento_medio: '>= 0.8' },
    condicao_remocao: null,
    descricao_publica: 'Compartilha conhecimento e ajuda ativamente outros usuários',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000007',
    nome: 'Influenciador',
    cor_hex: '#F8B195',
    cor_border: '#EB984E',
    icone: '📢',
    prioridade_exibicao: 8,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: { posts_virais: '>= 10', compartilhamentos_totais: '>= 10000' },
    condicao_remocao: null,
    descricao_publica: 'Conteúdo frequentemente compartilhado e viraliza na rede',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000008',
    nome: 'Especialista',
    cor_hex: '#1ABC9C',
    cor_border: '#0E6251',
    icone: '🔬',
    prioridade_exibicao: 8,
    categoria: 'positive',
    visibilidade: 'public',
    condicao_aquisicao: { posts_tecni_altamente_citados: '>= 100' },
    condicao_remocao: null,
    descricao_publica: 'Expertise reconhecida em tópicos específicos',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // ============================================================================
  // SEGURANÇA E MODERAÇÃO (5 tags)
  // ============================================================================

  {
    id: '00000000-0000-0000-0000-000000000004',
    nome: 'Advertido',
    cor_hex: '#F39C12',
    cor_border: '#B8790A',
    icone: '⚠️',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: { avisos_oficiais: '>= 1' },
    condicao_remocao: { apos_dias_sem_infracoes: 60 },
    descricao_publica: 'Recebeu aviso oficial por violação de regras',
    descricao_interna: 'Usuário foi advertido por violar regras da comunidade',
    notificar_aquisicao: true,
    notificar_remocao: true,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000005',
    nome: 'Silenciado',
    cor_hex: '#34495E',
    cor_border: '#1C2833',
    icone: '🔇',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: { tempo_silenciamento_ativo: '> timestamp_atual' },
    condicao_remocao: { tempo_silenciamento_expirado: true },
    descricao_publica: 'Permissões de postagem temporariamente restritas',
    descricao_interna: 'Usuário em suspensão temporária de postagens',
    notificar_aquisicao: true,
    notificar_remocao: true,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000009',
    nome: 'Banido',
    cor_hex: '#C0392B',
    cor_border: '#78281F',
    icone: '🚫',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: { permanentemente_banido: true },
    condicao_remocao: { manual: true },
    descricao_publica: 'Acesso permanentemente revogado',
    descricao_interna: 'Usuário foi permanentemente banido da plataforma',
    notificar_aquisicao: false,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000010',
    nome: 'Spam',
    cor_hex: '#D35400',
    cor_border: '#922B15',
    icone: '🚨',
    prioridade_exibicao: 9,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: { spam_detectado: true, posts_spam: '>= 5' },
    condicao_remocao: { apos_limpeza_manual: true },
    descricao_publica: 'Padrão de spam detectado',
    descricao_interna: 'Comportamento de spam identificado',
    notificar_aquisicao: true,
    notificar_remocao: true,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000011',
    nome: 'Golpista',
    cor_hex: '#8B0000',
    cor_border: '#4C0000',
    icone: '🎭',
    prioridade_exibicao: 10,
    categoria: 'moderation',
    visibilidade: 'public',
    condicao_aquisicao: { atividade_fraudulenta: true },
    condicao_remocao: { manual: true },
    descricao_publica: 'Atividade fraudulenta ou golpe detectada',
    descricao_interna: 'Comportamento fraudulento ou tentativa de golpe',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // ============================================================================
  // TEMPO E ENGAJAMENTO (5 tags)
  // ============================================================================

  {
    id: '00000000-0000-0000-0000-000000000002',
    nome: 'Recém-chegado',
    cor_hex: '#AED6F1',
    cor_border: '#5DADE2',
    icone: '🌱',
    prioridade_exibicao: 5,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: { tempo_desde_criacao: '<= 7 dias' },
    condicao_remocao: { tempo_desde_criacao: '> 7 dias' },
    descricao_publica: 'Novo na Chrono - bem-vindo ao círculo!',
    notificar_aquisicao: false,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000012',
    nome: 'Contributivo',
    cor_hex: '#52BE80',
    cor_border: '#1E8449',
    icone: '🤝',
    prioridade_exibicao: 6,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: { posts_por_semana: '>= 3', consistencia_meses: '>= 3' },
    condicao_remocao: { posts_por_semana: '< 1' },
    descricao_publica: 'Contribui ativamente com conteúdo regularmente',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000013',
    nome: 'Engajado',
    cor_hex: '#E74C3C',
    cor_border: '#A93226',
    icone: '🔥',
    prioridade_exibicao: 7,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: { interacoes_dia: '>= 50', dias_consecutivos: '>= 14' },
    condicao_remocao: { inatividade_dias: '>= 30' },
    descricao_publica: 'Altamente engajado com a comunidade',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000014',
    nome: 'Veterano',
    cor_hex: '#8E44AD',
    cor_border: '#52217D',
    icone: '👑',
    prioridade_exibicao: 8,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: { tempo_desde_criacao: '> 365 dias', posts_totais: '>= 100' },
    condicao_remocao: null,
    descricao_publica: 'Membro experiente com mais de um ano na plataforma',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000015',
    nome: 'Fundador',
    cor_hex: '#F39C12',
    cor_border: '#D68910',
    icone: '🏛️',
    prioridade_exibicao: 10,
    categoria: 'time',
    visibilidade: 'public',
    condicao_aquisicao: { membro_fundador: true },
    condicao_remocao: { manual: true },
    descricao_publica: 'Membro fundador dos primeiros dias da Chrono',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  // ============================================================================
  // ESTILO E COMPORTAMENTO (6 tags)
  // ============================================================================

  {
    id: '00000000-0000-0000-0000-000000000016',
    nome: 'Humorista',
    cor_hex: '#FFD700',
    cor_border: '#FFA500',
    icone: '😄',
    prioridade_exibicao: 4,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { posts_com_humor: '>= 50', engajamento_humor: '> media' },
    condicao_remocao: null,
    descricao_publica: 'Estilo de conteúdo predominantemente humorístico',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000017',
    nome: 'Criativo',
    cor_hex: '#E91E63',
    cor_border: '#AD1457',
    icone: '🎨',
    prioridade_exibicao: 7,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { posts_criativos_originais: '>= 100' },
    condicao_remocao: null,
    descricao_publica: 'Conteúdo criativo original e inovador',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000018',
    nome: 'Conhecedor',
    cor_hex: '#2196F3',
    cor_border: '#0D47A1',
    icone: '📚',
    prioridade_exibicao: 6,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { posts_sobre_tendencias: '>= 75', engajamento_alto: true },
    condicao_remocao: null,
    descricao_publica: 'Conhecedor de tendências e sempre atualizado',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000019',
    nome: 'Altruísta',
    cor_hex: '#00BCD4',
    cor_border: '#00838F',
    icone: '❤️',
    prioridade_exibicao: 6,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { compartilhamentos_altruistas: '>= 100', comentarios_ajuda: '>= 50' },
    condicao_remocao: null,
    descricao_publica: 'Generoso: frequentemente compartilha e ajuda outros',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000020',
    nome: 'Minimalista',
    cor_hex: '#9E9E9E',
    cor_border: '#424242',
    icone: '✨',
    prioridade_exibicao: 4,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { posts_concisos: '>= 75', caracteres_medios: '< 280' },
    condicao_remocao: null,
    descricao_publica: 'Comunicação clara, concisa e direta',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  },

  {
    id: '00000000-0000-0000-0000-000000000021',
    nome: 'Contador de Histórias',
    cor_hex: '#FF5722',
    cor_border: '#BF360C',
    icone: '📖',
    prioridade_exibicao: 6,
    categoria: 'style',
    visibilidade: 'public',
    condicao_aquisicao: { posts_narrativos: '>= 50', engajamento_narrativo: '> media' },
    condicao_remocao: null,
    descricao_publica: 'Mestre em contar histórias envolventes',
    notificar_aquisicao: true,
    notificar_remocao: false,
    criado_em: new Date(),
    atualizado_em: new Date()
  }
];

export const TAG_IDS = {
  // Positivos
  VERIFICADO: '00000000-0000-0000-0000-000000000001',
  POPULAR: '00000000-0000-0000-0000-000000000003',
  MENTOR: '00000000-0000-0000-0000-000000000006',
  INFLUENCIADOR: '00000000-0000-0000-0000-000000000007',
  ESPECIALISTA: '00000000-0000-0000-0000-000000000008',
  // Moderação
  ADVERTIDO: '00000000-0000-0000-0000-000000000004',
  SILENCIADO: '00000000-0000-0000-0000-000000000005',
  BANIDO: '00000000-0000-0000-0000-000000000009',
  SPAM: '00000000-0000-0000-0000-000000000010',
  GOLPISTA: '00000000-0000-0000-0000-000000000011',
  // Tempo e Engajamento
  RECEM_CHEGADO: '00000000-0000-0000-0000-000000000002',
  CONTRIBUTIVO: '00000000-0000-0000-0000-000000000012',
  ENGAJADO: '00000000-0000-0000-0000-000000000013',
  VETERANO: '00000000-0000-0000-0000-000000000014',
  FUNDADOR: '00000000-0000-0000-0000-000000000015',
  // Estilo e Comportamento
  HUMORISTA: '00000000-0000-0000-0000-000000000016',
  CRIATIVO: '00000000-0000-0000-0000-000000000017',
  CONHECEDOR: '00000000-0000-0000-0000-000000000018',
  ALTRUISTA: '00000000-0000-0000-0000-000000000019',
  MINIMALISTA: '00000000-0000-0000-0000-000000000020',
  CONTADOR_HISTORIAS: '00000000-0000-0000-0000-000000000021'
};

-- ============================================
-- TABELA DE DEFINIÇÕES DE TAGS
-- ============================================

CREATE TABLE IF NOT EXISTS tag_definitions (
    id SERIAL PRIMARY KEY,
    
    -- Nome interno da tag (slug)
    tag_key VARCHAR(50) NOT NULL UNIQUE,
    
    -- Nome exibido
    display_name VARCHAR(100) NOT NULL,
    
    -- Descrição
    description TEXT,
    
    -- Cor da tag (hex)
    color VARCHAR(7) DEFAULT '#0084ff',
    
    -- Ícone (emoji ou nome de ícone)
    icon VARCHAR(50),
    
    -- Tipo de tag
    tag_type VARCHAR(50) NOT NULL DEFAULT 'achievement',
    -- Tipos: 'system', 'achievement', 'role', 'badge'
    
    -- Critérios para obter a tag (JSON)
    criteria JSONB,
    
    -- Ordem de exibição
    display_order INTEGER DEFAULT 0,
    
    -- Ativa/Inativa
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tag_definitions_type ON tag_definitions(tag_type);
CREATE INDEX IF NOT EXISTS idx_tag_definitions_active ON tag_definitions(is_active);


-- ============================================
-- TABELA DE TAGS DOS USUÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS user_tags (
    id BIGSERIAL PRIMARY KEY,
    
    user_id UUID NOT NULL,
    tag_key VARCHAR(50) NOT NULL,
    
    -- Quando recebeu a tag
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadados (ex: progresso, nível, etc)
    metadata JSONB,
    
    -- Foreign keys
    CONSTRAINT fk_user_tag_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_user_tag_definition FOREIGN KEY (tag_key) 
        REFERENCES tag_definitions(tag_key) ON DELETE CASCADE,
    
    -- Constraint: usuário não pode ter tag duplicada
    CONSTRAINT uk_user_tag UNIQUE (user_id, tag_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_tags_user ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_key ON user_tags(tag_key);


-- ============================================
-- INSERIR TAGS PADRÃO DO SISTEMA
-- ============================================

INSERT INTO tag_definitions (tag_key, display_name, description, color, icon, tag_type, display_order) 
VALUES
-- Tags de Sistema
('verified', 'Verificado', 'Perfil verificado pela equipe', '#0084ff', '✓', 'system', 1),
('admin', 'Admin', 'Administrador do Chrono', '#ff0000', '⚙️', 'system', 2),
('moderator', 'Moderador', 'Moderador da comunidade', '#ff6b00', '🛡️', 'system', 3),
('premium', 'Premium', 'Assinatura premium ativa', '#ffd700', '⭐', 'system', 4),

-- Tags de Comportamento (Conteúdo)
('observer', 'Observador', 'Curte mais do que posta', '#9b59b6', '👁️', 'achievement', 10),
('creator', 'Criador', 'Criador ativo de conteúdo', '#e74c3c', '✍️', 'achievement', 11),
('storyteller', 'Contador de Histórias', 'Posts com narrativas épicas (>500 caracteres)', '#f39c12', '📖', 'achievement', 12),
('visual_artist', 'Artista Visual', 'Posta muitas imagens e fotos', '#e74c3c', '🎨', 'achievement', 13),
('videomaker', 'Videomaker', 'Cria e posta vídeos frequentemente', '#ff6b00', '🎥', 'achievement', 14),
('thread_master', 'Mestre dos Threads', 'Cria threads longas e engajadas', '#9b59b6', '🧵', 'achievement', 15),

-- Tags de Interação Social
('social', 'Social', 'Interage frequentemente (>100 comentários)', '#3498db', '💬', 'achievement', 20),
('reply_king', 'Rei das Respostas', 'Sempre responde comentários deixados', '#1abc9c', '↩️', 'achievement', 21),
('debater', 'Debatedor', 'Comentários profundos e argumentados', '#e91e63', '⚔️', 'achievement', 22),

-- Tags de Engagement
('viral', 'Viral', 'Post recebeu >1000 likes', '#ff0000', '🔥', 'achievement', 30),
('trending', 'Trending', 'Posts aparecem em trending', '#ff6b00', '📈', 'achievement', 31),
('engagement_god', 'Deus do Engagement', 'Taxa média de engajamento >20%', '#e74c3c', '👑', 'achievement', 32),

-- Tags de Tempo/Pioneirismo
('pioneer', 'Pioneiro', 'Usuário dos primeiros dias', '#2ecc71', '🚀', 'badge', 40),
('veteran', 'Veterano', 'Mais de 1 ano na plataforma', '#95a5a6', '⭐', 'badge', 41),
('active', 'Ativo', 'Posta regularmente (10+ posts últimos 30 dias)', '#1abc9c', '🔥', 'badge', 42),
('insomniac', 'Insone', 'Posta frequentemente entre 00h-06h', '#9b59b6', '🌙', 'badge', 43),
('morning_person', 'Madrugada', 'Posta entre 05h-09h regularmente', '#2ecc71', '☀️', 'badge', 44),
('night_owl', 'Coruja Noturna', 'Posta frequentemente entre 22h-03h', '#8e44ad', '🦉', 'badge', 45),
('weekend_warrior', 'Guerreiro de Fim de Semana', '80% dos posts sáb/dom', '#f39c12', '🎉', 'badge', 46),
('beta_tester', 'Beta Tester', 'Cadastrado antes de janeiro de 2025', '#00ff00', '🧪', 'badge', 5),

-- Tags de Conquistas/Influência
('popular', 'Popular', 'Mais de 1000 seguidores', '#e91e63', '💫', 'achievement', 50),
('influencer', 'Influenciador', 'Mais de 10k seguidores', '#9c27b0', '👑', 'achievement', 51),
('prolific', 'Prolífico', 'Mais de 100 posts', '#ff9800', '📝', 'achievement', 52),
('legend', 'Lenda', '>5000 seguidores AND >1000 posts', '#ffd700', '🏆', 'achievement', 53),

-- Tags Especiais/Raras
('founder', 'Fundador', 'IDs 1-10 - Fundadores do Chrono', '#ff0000', '👑', 'system', 0),
('supporter', 'Apoiador', 'Doou ou apoiou o projeto', '#ff6b00', '❤️', 'achievement', 60)
ON CONFLICT (tag_key) DO NOTHING;

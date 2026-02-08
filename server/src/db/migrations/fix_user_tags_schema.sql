-- ============================================
-- FIX USER_TAGS SCHEMA
-- ============================================

-- Drop existing constraints
ALTER TABLE user_tags DROP CONSTRAINT IF EXISTS fk_user_tag_definition;

-- Backup existing data just in case
CREATE TABLE user_tags_backup AS SELECT * FROM user_tags;

-- Drop and recreate user_tags table with correct schema
DROP TABLE IF EXISTS user_tags CASCADE;

-- ============================================
-- RECREATE TAG_DEFINITIONS WITH CORRECT SCHEMA  
-- ============================================

DROP TABLE IF EXISTS tag_definitions CASCADE;

CREATE TABLE tag_definitions (
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
-- RECREATE USER_TAGS TABLE
-- ============================================

CREATE TABLE user_tags (
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
-- INSERIR TODAS AS TAGS
-- ============================================

INSERT INTO tag_definitions (tag_key, display_name, description, color, icon, tag_type, display_order) 
VALUES
-- Tags de Sistema
('verified', 'Verificado', 'Perfil verificado pela equipe', '#0084ff', '✓', 'system', 1),
('admin', 'Admin', 'Administrador do Chrono', '#ff0000', '⚙️', 'system', 2),
('moderator', 'Moderador', 'Moderador da comunidade', '#ff6b00', '🛡️', 'system', 3),
('premium', 'Premium', 'Assinatura premium ativa', '#ffd700', '⭐', 'system', 4),
('founder', 'Founder', 'Um dos fundadores do Chrono', '#ff1493', '👑', 'system', 5),

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

-- Tags de Engajamento
('viral', 'Viral', 'Post virou viral (>1000 likes)', '#ff00aa', '🚀', 'achievement', 30),
('trending', 'Trending', 'Conteúdo que está em alta (>50 likes/post)', '#00d4ff', '📈', 'achievement', 31),
('engagement_god', 'Deus do Engajamento', 'Taxa de engajamento > 20%', '#ffaa00', '⚡', 'achievement', 32),

-- Tags baseadas em Tempo
('pioneer', 'Pioneiro', 'Um dos primeiros usuários', '#4a90e2', '🌅', 'achievement', 40),
('beta_tester', 'Beta Tester', 'Testou o Chrono beta', '#00ff00', '🧪', 'achievement', 41),
('veteran', 'Veterano', 'Usuário desde os primeiros dias', '#8b4513', '⚔️', 'achievement', 42),
('active', 'Ativo', 'Usando Chrono regularmente', '#00ff00', '✨', 'achievement', 43),
('insomniac', 'Insomne', '30%+ dos posts entre 00:00-04:00', '#1a1a2e', '🌙', 'achievement', 44),
('morning_person', 'Madrugador', '30%+ dos posts entre 05:00-10:00', '#ffd700', '🌅', 'achievement', 45),
('night_owl', 'Noturno', '30%+ dos posts entre 20:00-23:59', '#6a0dad', '🌃', 'achievement', 46),
('weekend_warrior', 'Guerreiro do Fim de Semana', '80%+ dos posts nos fins de semana', '#ff1493', '⚔️', 'achievement', 47),

-- Tags de Influência
('popular', 'Popular', 'Tem muitos seguidores (>500)', '#ff69b4', '👥', 'achievement', 50),
('influencer', 'Influenciador', 'Seguidores > 1000', '#ff1493', '📣', 'achievement', 51),
('prolific', 'Prolífico', 'Posta mais de 100 vezes', '#ff00ff', '📚', 'achievement', 52),
('legend', 'Lenda', 'Faz parte da história do Chrono', '#ffd700', '🏆', 'achievement', 53),
('supporter', 'Apoiador', 'Suporta ativamente a comunidade', '#00ff00', '💚', 'achievement', 54)
ON CONFLICT (tag_key) DO NOTHING;

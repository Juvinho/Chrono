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

-- Tags de Comportamento
('observer', 'Observador', 'Curte mais do que posta', '#9b59b6', '👁️', 'achievement', 10),
('creator', 'Criador', 'Criador ativo de conteúdo', '#e74c3c', '✍️', 'achievement', 11),
('storyteller', 'Contador de Histórias', 'Narrativas épicas', '#f39c12', '📖', 'achievement', 12),
('social', 'Social', 'Interage frequentemente', '#3498db', '💬', 'achievement', 13),

-- Tags de Tempo/Pioneirismo
('pioneer', 'Pioneiro', 'Usuário dos primeiros dias', '#2ecc71', '🚀', 'badge', 20),
('veteran', 'Veterano', 'Mais de 1 ano na plataforma', '#95a5a6', '⭐', 'badge', 21),
('active', 'Ativo', 'Login diário por 30 dias', '#1abc9c', '🔥', 'badge', 22),

-- Tags de Conquistas
('popular', 'Popular', 'Mais de 1000 seguidores', '#e91e63', '💫', 'achievement', 30),
('influencer', 'Influenciador', 'Mais de 10k seguidores', '#9c27b0', '👑', 'achievement', 31),
('prolific', 'Prolífico', 'Mais de 100 posts', '#ff9800', '📝', 'achievement', 32)
ON CONFLICT (tag_key) DO NOTHING;

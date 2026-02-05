-- Script para limpar todas as tabelas do banco de dados
-- Mantém a estrutura, apenas remove os dados

-- Desabilitar temporariamente as verificações de foreign key
SET session_replication_role = 'replica';

-- Limpar tabelas na ordem correta (respeitando foreign keys)
TRUNCATE TABLE poll_votes CASCADE;
TRUNCATE TABLE reactions CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE follows CASCADE;
TRUNCATE TABLE users CASCADE;

-- Reabilitar verificações de foreign key
SET session_replication_role = 'origin';

-- Resetar sequências se houver (PostgreSQL gerencia UUIDs automaticamente, mas caso haja)
-- Não necessário para UUID, mas deixando comentado caso precise no futuro
-- RESET SEQUENCE IF EXISTS;

SELECT 'Todas as tabelas foram limpas com sucesso!' AS status;


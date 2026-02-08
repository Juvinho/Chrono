#!/bin/bash
# ============================================
# TESTE RÁPIDO DO SISTEMA DE BIO
# ============================================

echo "🚀 INICIANDO TESTES DO SISTEMA DE BIO"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}▶ Teste 1: Verificar se as tabelas foram criadas${NC}"
psql $DATABASE_URL <<EOF
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tag_definitions'
  ) as "tag_definitions_exists";
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tags'
  ) as "user_tags_exists";
EOF
echo ""

echo -e "${BLUE}▶ Teste 2: Contar tags definidas${NC}"
psql $DATABASE_URL -c "SELECT COUNT(*) as 'Tags Definidas' FROM tag_definitions WHERE is_active = true;"
echo ""

echo -e "${BLUE}▶ Teste 3: Listar tags disponíveis${NC}"
psql $DATABASE_URL <<EOF
  SELECT 
    tag_key,
    display_name,
    tag_type,
    display_order
  FROM tag_definitions
  WHERE is_active = true
  ORDER BY display_order
  LIMIT 5;
EOF
echo ""

echo -e "${BLUE}▶ Teste 4: Chamar API para obter bio de um usuário${NC}"
echo "Exemplo: GET /api/bio/[USER_ID]/bio"
echo "Response esperada:"
echo '{
  "customBio": "...",
  "autoBio": "...",
  "tags": [...]
}'
echo ""

echo -e "${GREEN}✅ TESTES PREPARADOS${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMAS ETAPAS:${NC}"
echo "1. Iniciar servidor: npm run dev (na pasta server)"
echo "2. Testar endpoint: curl http://localhost:3001/api/bio/USER_ID/bio"
echo "3. Verificar logs do cron: grep 'Tag update' console.log"
echo "4. Ver documentação: cat SISTEMA_BIO_GUIA.md"

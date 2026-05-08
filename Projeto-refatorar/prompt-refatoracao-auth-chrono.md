# Prompt: Refatoração de Autenticação — Chrono

> **Objetivo:** Remover verificação de email, 2FA e captcha do sistema de autenticação. Manter apenas login/senha com um usuário padrão funcional.

---

## Como Usar Este Arquivo

Preencha cada bloco `# TODO` com as informações do seu projeto antes de colar no Claude Code. Os blocos marcados com ✅ já estão prontos.

---

```xml
<role>

Você é um engenheiro de software sênior especializado em sistemas de autenticação e refatoração de código legado. Você tem experiência em simplificar fluxos de auth sem comprometer a estrutura existente do projeto, priorizando soluções limpas, reutilizáveis e fáceis de manter. Você entende que durante desenvolvimento e testes, um sistema de login simplificado é necessário, e executa essa simplificação de forma cirúrgica sem quebrar outras partes do sistema.

</role>

<project_context>

# TODO: Cole aqui a estrutura de pastas do projeto
# Use o script: find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './downloads*'

Projeto: Chrono — Rede social com timeline cronológica
Stack: Next.js 15 + React + TypeScript (frontend) | Node.js + TypeScript (backend)
Auth atual: Email + Senha + Verificação de Email + 2FA + hCaptcha

# TODO: Referencie os arquivos de auth, ex:
# - src/app/(auth)/login/page.tsx
# - src/app/api/auth/[...nextauth]/route.ts
# - src/lib/auth.ts
# - src/middleware.ts

</project_context>

<architecture>

O sistema de autenticação funciona em 3 pilares:

1. **Frontend** — Formulários de login/registro com validações e captcha
2. **Backend/API** — Rotas de auth que verificam email, validam 2FA e emitem tokens
3. **Middleware** — Guards de rota que bloqueiam usuários não verificados

**Fluxo atual:**
Login → hCaptcha → Credenciais → Verificação de Email → 2FA (se ativo) → Dashboard

**Fluxo desejado:**
Login → Credenciais (email + senha) → Dashboard

</architecture>

<status>

Estamos na fase de desenvolvimento/testes locais. O sistema de autenticação está com múltiplas camadas que travam o desenvolvimento.

NÃO MARQUE NADA COMO RESOLVIDO sem que eu confirme que funcionou.

# TODO: Indique onde estão os bugs documentados, ex:
# - Os logs de erro estão em BUGS.md na seção "## Auth Bugs"

</status>

<problem>

O fluxo de login atual exige:
1. Resolver hCaptcha — quebra ao pressionar Enter, exige clique manual
2. Verificação de email — bloqueia acesso sem caixa de entrada configurada
3. 2FA — adiciona etapa extra desnecessária no ambiente de desenvolvimento

Isso impede testes rápidos e bloqueia o desenvolvimento de outras features.

Precisamos de um **usuário padrão** acessível imediatamente para testes, sem nenhuma dessas barreiras.

</problem>

<task>

Siga rigorosamente esta ordem de execução:

1. **Mapeie todos os arquivos de auth** — liste todos os arquivos relacionados à autenticação (login, registro, middleware, rotas de API, guards) usando:
   ```bash
   grep -r "captcha\|2fa\|twoFactor\|verifyEmail\|emailVerif" . --include="*.ts" --include="*.tsx" -l --exclude-dir={node_modules,.next,.git}
   ```

2. **Remova o hCaptcha** — retire a verificação de captcha do formulário de login e do backend. Remova o componente e a validação server-side.

3. **Desative a verificação de email** — comente ou remova o guard que bloqueia usuários com email não verificado. Se houver flag no banco/schema, defina o padrão como `emailVerified: true`.

4. **Desative o 2FA** — remova a etapa de two-factor authentication do fluxo de login. Se houver tabela/coluna de 2FA no banco, ignore-a na lógica de auth.

5. **Crie/garanta um usuário padrão de teste** — crie um script seed ou use um já existente para garantir que exista um usuário com:
   - Email: `dev@chrono.test`
   - Senha: `chrono123`
   - Sem email verification pendente
   - Sem 2FA ativo
   - Role: admin (ou o maior nível de acesso disponível)

6. **Teste o fluxo** — acesse a tela de login, insira as credenciais do usuário padrão, confirme que entra no dashboard sem nenhuma etapa extra. Se falhar, analise o erro e corrija antes de reportar. Só escale para mim quando esgotar as possibilidades.

</task>

<validation>

### Critério de Sucesso

- Acessar `/login`, digitar `dev@chrono.test` + `chrono123`, pressionar Enter ou clicar em Conectar → entrar direto no dashboard
- Nenhum modal de captcha aparece
- Nenhum email de verificação é exigido
- Nenhuma tela de 2FA aparece

### O Que NÃO Deve Ser Alterado

- Layout e estilos da tela de login
- Lógica de sessão/token após o login bem-sucedido
- Rotas protegidas por autenticação (middleware de sessão permanece)
- Funcionalidade de "Esqueceu a senha?" e "Registre-se"
- Qualquer feature fora do fluxo de auth

### Escolha Comentar ao invés de Deletar

Para código de captcha e 2FA: **comente** com `// [DISABLED - DEV MODE]` ao invés de deletar. Facilita reativar depois.

</validation>

<constraints>

### Abordagem Técnica

- NÃO refatore a arquitetura de autenticação — apenas remova as camadas extras
- NÃO troque a biblioteca de auth (NextAuth, JWT, etc.) ou mude a estratégia de sessão
- NÃO crie novos providers de auth ou novas rotas de API além das necessárias para o seed

### Estrutura de Arquivos

- NÃO altere a estrutura de pastas ou renomeie arquivos
- NÃO crie arquivos auxiliares de documentação sem eu pedir
- NÃO crie novos componentes — apenas edite os existentes

### Comunicação

- NÃO repita código que já foi mostrado antes
- NÃO explique conceitos de auth que já conhecemos
- NÃO re-leia arquivos que já foram lidos na mesma sessão

</constraints>

<techniques>

### Estratégia de Busca (Context Economy)

Exclusão mandatória ao usar `grep`, `find` ou `ls`:
```bash
# Estrutura do projeto
find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './.next*'

# Buscar arquivos de auth
grep -r "captcha\|emailVerif\|twoFactor" . --include="*.ts" --include="*.tsx" -l \
  --exclude-dir={node_modules,.next,.git,__pycache__}
```

### Comunicação

- Ao iniciar cada fase, diga o que vai fazer em 1-2 frases
- Ao concluir, diga o que fez e qual o próximo passo
- Se encontrar uma decisão arquitetural ambígua, informe o que escolheu e por quê
- Economize contexto: não repita código já mostrado, não explique conceitos já discutidos

### Autonomia

- Rode TODOS os comandos necessários você mesmo (install, seed, build). Não me peça para rodar manualmente a não ser que só eu tenha permissão
- Se um comando falhar, analise o erro e tente resolver. Só escale quando esgotar alternativas
- Ao concluir cada etapa, rode um teste para confirmar que funciona

### Ambiente

- Sempre pergunte antes de dar commit, sugerindo uma mensagem de commit (sem push)
- Limpe caches antes de rodar testes: `rm -rf .next && npm run dev`

</techniques>

<self_validation>

Antes de reportar que terminou, verifique:

- [ ] Login com `dev@chrono.test` / `chrono123` funciona sem captcha, email verification e 2FA?
- [ ] O layout da tela de login está intacto?
- [ ] Nenhuma rota ou feature fora do auth foi modificada?
- [ ] O código removido foi comentado com `// [DISABLED - DEV MODE]` e não deletado?
- [ ] Existe um seed ou instrução clara de como recriar o usuário padrão em outro ambiente?

Se qualquer item falhar, corrija antes de me reportar.

</self_validation>
```

---

## Checklist Pré-Envio

Antes de colar no Claude Code, preencha os `# TODO`:

- [ ] Estrutura de pastas colada em `<project_context>`
- [ ] Arquivos de auth referenciados (login page, API route, middleware, lib/auth)
- [ ] Arquivo de bugs referenciado em `<status>` (se existir)

---

## Referência Rápida — Arquivos Comuns de Auth no Next.js

| Arquivo | O que contém |
|---|---|
| `src/app/api/auth/[...nextauth]/route.ts` | Configuração do NextAuth, providers, callbacks |
| `src/lib/auth.ts` ou `src/lib/auth.config.ts` | Opções de sessão, JWT, guards |
| `src/middleware.ts` | Proteção de rotas, verificação de sessão |
| `src/app/(auth)/login/page.tsx` | Formulário de login, captcha, UI |
| `src/components/auth/LoginForm.tsx` | Lógica do formulário de login |
| `prisma/seed.ts` ou `scripts/seed.ts` | Seed do banco, usuário padrão |
| `.env.local` | Chaves do captcha, segredo do NextAuth |

> 💡 **Dica:** Se não souber quais arquivos têm captcha ou 2FA, rode o comando de mapeamento da **Etapa 1** da `<task>` primeiro e cole o resultado aqui antes de prosseguir.

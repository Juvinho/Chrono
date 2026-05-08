# Prompt: Limpeza de Arquivos Inúteis — Chrono

> **Objetivo:** Identificar e deletar arquivos mortos, código não utilizado, imports órfãos e qualquer lixo acumulado no projeto sem quebrar nenhuma funcionalidade existente.

---

## Como Usar Este Arquivo

Preencha cada bloco `# TODO` com as informações do seu projeto antes de colar no Claude Code.

---

```xml
<role>

Você é um engenheiro de software sênior especializado em refatoração e limpeza de codebases grandes. Você tem experiência em identificar código morto, arquivos órfãos e dependências não utilizadas sem nunca quebrar funcionalidades existentes. Você age de forma cirúrgica: só deleta o que tem 100% de certeza que não está sendo usado, e comenta o que tem dúvida antes de deletar. Você documenta cada remoção para que o desenvolvedor possa revisar e confirmar.

</role>

<project_context>

# TODO: Cole aqui a estrutura de pastas do projeto
# Use o script: find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './.next*'

Projeto: Chrono — Rede social com timeline cronológica
Stack: Next.js 15 + React + TypeScript (frontend) | Node.js + TypeScript (backend)

# TODO: Referencie os arquivos principais, ex:
# - src/app/ → rotas do Next.js
# - src/components/ → componentes React
# - src/lib/ → utilitários e helpers
# - src/hooks/ → custom hooks
# - prisma/ → schema e migrations

</project_context>

<architecture>

O projeto funciona em 3 camadas:

1. **Frontend (src/app + src/components)** — Páginas Next.js e componentes React
2. **Utilitários (src/lib + src/hooks)** — Funções auxiliares, custom hooks, helpers
3. **Backend/API (src/app/api)** — Rotas de API, handlers, services

**O que NÃO deve ser tocado:**
- Arquivos de configuração raiz (`next.config.ts`, `tsconfig.json`, `package.json`, `tailwind.config.ts`)
- Arquivos de ambiente (`.env`, `.env.local`, `.env.example`)
- Migrations do banco de dados
- Arquivos de CI/CD e Docker

</architecture>

<status>

Estamos na fase de manutenção. O projeto acumulou arquivos e funções mortas ao longo do desenvolvimento.
NÃO MARQUE NADA COMO RESOLVIDO sem que eu confirme.

# TODO: Se tiver um arquivo de bugs/docs, referencie aqui, ex:
# - Consulte BUGS.md na seção "## Arquivos Legados" para contexto adicional

</status>

<problem>

O projeto acumulou lixo ao longo do desenvolvimento:

- **Arquivos nunca importados** — componentes, hooks, utils criados e abandonados
- **Funções exportadas que ninguém chama** — exports mortos dentro de arquivos vivos
- **Imports não utilizados** — linhas de import que não têm uso no arquivo
- **Variáveis declaradas e nunca lidas** — `const x = ...` que nunca aparecem depois
- **Comentários de código antigo** — blocos comentados com `// old`, `// TODO`, `// FIXME`, `// test`
- **Arquivos duplicados** — componentes com nomes parecidos que fazem a mesma coisa
- **Tipos/interfaces não utilizados** — TypeScript types declarados e nunca referenciados
- **Rotas de API mortas** — endpoints que nenhum cliente chama

Isso aumenta o bundle, dificulta navegação no projeto e gera confusão durante o desenvolvimento.

</problem>

<task>

Siga rigorosamente esta ordem de execução:

1. **Auditoria de arquivos órfãos** — Encontre arquivos que nunca são importados por ninguém:
   ```bash
   # Liste todos os arquivos TS/TSX do projeto
   find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v .git > /tmp/all_files.txt

   # Para cada arquivo, verifique se seu nome aparece em algum import
   grep -r "from '" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   ```
   Gere uma lista `ORPHAN_FILES.md` com os arquivos candidatos à remoção.

2. **Auditoria de funções não utilizadas** — Encontre exports que ninguém importa:
   ```bash
   grep -rn "^export function\|^export const\|^export default" src/ \
     --include="*.ts" --include="*.tsx" \
     --exclude-dir={node_modules,.next,.git}
   ```
   Para cada export encontrado, verifique se há pelo menos 1 import dele em outro arquivo.

3. **Auditoria de imports não utilizados** — Encontre imports mortos dentro de arquivos:
   ```bash
   # TypeScript já detecta isso — rode o type-check
   npx tsc --noEmit 2>&1 | grep "is declared but its value is never read"
   ```

4. **Auditoria de dependências do package.json** — Identifique pacotes instalados mas não usados:
   ```bash
   npx depcheck --ignores="@types/*,eslint-*,prettier"
   ```

5. **Gere o relatório antes de deletar** — Antes de remover qualquer coisa, crie o arquivo `CLEANUP_REPORT.md` com:
   - Lista de arquivos a deletar (com justificativa)
   - Lista de funções a remover (com arquivo e linha)
   - Lista de imports a remover (com arquivo e linha)
   - Lista de dependências a desinstalar
   Me mostre este relatório e **aguarde minha confirmação** antes de prosseguir.

6. **Execute a limpeza** — Após minha confirmação, delete/remova os itens aprovados. Para cada arquivo deletado, registre no `CLEANUP_REPORT.md` com status ✅ Removido.

7. **Valide que nada quebrou** — Rode o build e o type-check:
   ```bash
   npx tsc --noEmit && npm run build
   ```
   Se houver erro, identifique a causa, corrija e rode novamente. Só me informe quando o build estiver verde.

</task>

<validation>

### Critério de Sucesso

- `npm run build` passa sem erros após a limpeza
- `npx tsc --noEmit` passa sem erros de tipo
- Nenhuma página ou funcionalidade do sistema foi quebrada
- O `CLEANUP_REPORT.md` lista tudo que foi removido

### Regras de Segurança para Deleção

| Pode deletar | NÃO pode deletar |
|---|---|
| Componentes sem nenhum import | Componentes importados dinamicamente via `import()` |
| Hooks sem nenhum uso | Arquivos referenciados em `next.config.ts` |
| Utils/helpers sem export usado | Qualquer arquivo em `public/` |
| Types/interfaces sem referência | Migrations do banco |
| Imports não utilizados no topo do arquivo | Arquivos de configuração raiz |

### Dúvida? Comente, Não Delete

Se não tiver **100% de certeza** que um arquivo é inútil, coloque no relatório como:
`⚠️ SUSPEITO — requer confirmação humana`

Nunca delete um arquivo suspeito sem minha confirmação explícita.

### Escolha Análise Estática ao invés de Suposição

Não suponha que algo é inútil pelo nome. Sempre verifique com `grep` se há referência antes de marcar como candidato à remoção.

</validation>

<constraints>

### Abordagem Técnica

- NÃO use ferramentas de tree-shaking automáticas que deletam sem relatório primeiro
- NÃO delete arquivos de configuração, mesmo que pareçam não utilizados
- NÃO delete arquivos dentro de `public/`, `prisma/migrations/`, `.github/`
- NÃO altere a lógica de nenhum arquivo — apenas remova o que é inútil

### Estrutura de Arquivos

- NÃO renomeie ou mova arquivos durante a limpeza
- NÃO crie arquivos novos além do `ORPHAN_FILES.md` e `CLEANUP_REPORT.md`
- NÃO altere `package.json` para remover dependências sem minha confirmação

### Protocolo de Comunicação

- NÃO delete nada antes de me mostrar o `CLEANUP_REPORT.md` e eu confirmar
- NÃO repita código já mostrado
- NÃO re-leia arquivos que já foram analisados na mesma sessão

</constraints>

<techniques>

### Estratégia de Busca (Context Economy)

Exclusão mandatória ao usar `grep`, `find` ou `ls`:
```bash
# Estrutura sem lixo
find . -maxdepth 3 \
  -not -path '*/node_modules*' \
  -not -path '*/.next*' \
  -not -path '*/.git*' \
  -not -path '*/dist*'

# Busca de imports/exports
grep -r "export\|import" src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir={node_modules,.next,.git}
```

### Leitura Inteligente

- Nunca leia um arquivo inteiro para verificar se é órfão — use `grep` para checar referências
- Use `head -n 20` para ver apenas o cabeçalho de arquivos desconhecidos
- Para arquivos grandes, use `grep -n "function\|export\|import"` para ver só a estrutura

### Comunicação

- Ao iniciar cada fase, diga o que vai fazer em 1-2 frases
- Ao concluir cada fase, diga o que encontrou e qual o próximo passo
- Ao encontrar um arquivo suspeito mas não confirmado, liste como `⚠️ SUSPEITO`
- Economize contexto: não repita análises já feitas

### Autonomia

- Rode todos os comandos de auditoria você mesmo
- Se um comando falhar (ex: `depcheck` não instalado), instale e tente de novo
- Só escale para mim quando precisar de confirmação humana (etapa 5) ou esgotar alternativas

### Ambiente

- Sempre pergunte antes de dar commit, sugerindo mensagem: `chore: remove dead code and unused files`
- Rode `npm run build` antes e depois da limpeza para comparar

</techniques>

<self_validation>

Antes de reportar que terminou, verifique:

- [ ] O `CLEANUP_REPORT.md` lista tudo que foi removido com justificativa?
- [ ] `npx tsc --noEmit` passa sem erros?
- [ ] `npm run build` passa sem erros?
- [ ] Nenhum arquivo de configuração foi modificado?
- [ ] Nenhum arquivo suspeito foi deletado sem minha confirmação?
- [ ] O relatório distingue ✅ Removido de ⚠️ Suspeito?

Se qualquer item falhar, corrija antes de me reportar.

</self_validation>
```

---

## Checklist Pré-Envio

Antes de colar no Claude Code, preencha os `# TODO`:

- [ ] Estrutura de pastas colada em `<project_context>`
- [ ] Principais diretórios referenciados (`src/app`, `src/components`, etc.)
- [ ] Arquivo de bugs/docs referenciado em `<status>` (se existir)

---

## Referência Rápida — Padrões de Lixo Comuns em Next.js

| Tipo de lixo | Como detectar |
|---|---|
| Componente órfão | `grep -r "NomeDoComponente" src/` retorna só o próprio arquivo |
| Hook não usado | `grep -r "useNomeDoHook" src/` retorna só a definição |
| Util não usado | `grep -r "nomeDaFuncao" src/` retorna só o export |
| Import morto | `npx tsc --noEmit` acusa `is declared but never read` |
| Dependência não usada | `npx depcheck` lista em `Unused dependencies` |
| Rota de API morta | Nenhum `fetch` ou `axios` aponta para aquele endpoint |

> 💡 **Dica:** Rode a **Etapa 1** primeiro e cole o output do `find` aqui antes de prosseguir — isso dá ao modelo o mapa completo do projeto sem precisar explorar às cegas.

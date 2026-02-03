# Guia de Migração: Railway para Supabase + Render

Como o seu plano trial do Railway acabou, vamos migrar a arquitetura para uma solução 100% gratuita e robusta:

1.  **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL gratuito e eterno).
2.  **Servidor (Backend)**: [Render](https://render.com/) (Hospedagem gratuita para Node.js com integração GitHub).

---

## Passo 1: Configurar o Supabase (Banco de Dados)

1.  Crie uma conta em [supabase.com](https://supabase.com/) e um novo projeto.
2.  No painel do projeto, vá em **Project Settings** > **Database**.
3.  Encontre a seção **Connection String**, mude para **URI** e copie a URL.
    *   *Dica: Ela se parece com `postgresql://postgres:[SENHA]@[HOST]:5432/postgres`.*
    *   *Nota: Substitua `[SENHA]` pela senha que você definiu ao criar o projeto.*

### Aplicar o Schema
Para criar as tabelas no Supabase:
1.  No painel do Supabase, clique em **SQL Editor**.
2.  Crie uma "New Query".
3.  Abra o arquivo [schema.sql](server/src/db/schema.sql) no seu editor, copie todo o conteúdo e cole no SQL Editor do Supabase.
4.  Clique em **Run**.

---

## Passo 2: Configurar o Render (Servidor/Backend)

O Supabase não hospeda servidores Node.js (Express), por isso usaremos o **Render**, que aceita o GitHub gratuitamente.

1.  Crie uma conta em [render.com](https://render.com/).
2.  Clique em **New** > **Web Service**.
3.  Conecte seu repositório do GitHub (`Juvinho/Chrono`).
4.  **Configurações do Serviço**:
    *   **Root Directory**: `server` (importante!).
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
5.  Vá em **Environment** e adicione as variáveis:
    *   `DATABASE_URL`: (A URL que você copiou do Supabase no Passo 1).
    *   `JWT_SECRET`: (Uma senha aleatória para os tokens).
    *   `NODE_ENV`: `production`

---

## Passo 3: Atualizar o Frontend

Agora que o seu backend está no Render (`https://chrono-pisx.onrender.com`), o frontend precisa saber para onde enviar os dados.

1.  Abra o arquivo [client.ts](src/api/client.ts).
2.  A `API_BASE_URL` já foi atualizada para você apontar para o Render.

---

## Por que o Supabase não aceitou o GitHub?

Provavelmente você tentou usar uma funcionalidade chamada **Supabase Launch** ou **Supabase Integration** que é voltada para deploys automáticos de Edge Functions (Pro). 

Para o seu caso (um servidor Express completo), a integração deve ser feita no **Render**, apontando para o banco do **Supabase**. Essa combinação é a favorita da comunidade para projetos gratuitos.

---
*Guia gerado pelo Assistente Chrono em 03/02/2026.*

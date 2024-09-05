# ⏳ CHRONO

<div align="center">

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

<br />

<img src="https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif" width="100%" style="border-radius: 10px" />

<br />

**Onde o tempo não é linear, e as conexões são eternas.**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [API](#-uso-da-api) • [Contribuição](#-contribuindo)

</div>

---

### 🚀 Sobre o Projeto

**Chrono** não é apenas mais uma rede social. É uma experiência **Cyberpunk** imersiva que reimagina como interagimos com o tempo e com os outros. 

Com uma interface futurista e recursos que brincam com a temporalidade, o Chrono permite que você compartilhe momentos, reaja com falhas na matrix e navegue por uma timeline que flui como um rio digital.

> "O futuro já chegou, só não está uniformemente distribuído." - William Gibson

---

### ✨ Funcionalidades

| Recurso | Descrição |
| :--- | :--- |
| 🔐 **Autenticação Segura** | Registro, login e recuperação de conta com criptografia de ponta a ponta (JWT + Bcrypt). |
| 🕰️ **Timeline Temporal** | Navegue por posts organizados cronologicamente ou viaje para momentos específicos. |
| 💬 **Interação em Tempo Real** | Mensagens diretas instantâneas e notificações push que te mantêm conectado. |
| ⚡ **Reações Cyberpunk** | Esqueça o "Like". Aqui usamos **Glitch**, **Upload**, **Corrupt**, **Rewind** e **Static**. |
| 🎨 **Personalização Total** | Temas visuais, avatares e banners para expressar sua identidade digital. |
| 🔁 **Echo System** | Reposte conteúdos (Echos) e espalhe a informação pela rede. |

---

### 🛠️ Tech Stack

O Chrono foi construído com as tecnologias mais modernas do mercado para garantir performance, escalabilidade e uma experiência de usuário fluida.

*   **Frontend:** React, TypeScript, Tailwind CSS, Vite.
*   **Backend:** Node.js, Express, Prisma (ORM).
*   **Banco de Dados:** PostgreSQL.
*   **DevOps:** Docker (opcional para setup rápido).

---

### 📦 Instalação

Siga os passos abaixo para rodar o Chrono na sua máquina local.

#### Pré-requisitos

*   Node.js 18+
*   PostgreSQL 15+ (ou Docker)
*   npm ou yarn

#### 1. Backend (O Coração)

```bash
# Entre na pasta do servidor
cd server

# Instale as dependências
npm install

# Configure as variáveis de ambiente (.env)
cp .env.example .env
# Edite o .env com suas credenciais do banco de dados

# Rode as migrations
npm run db:migrate

# Inicie o servidor
npm run dev
# 🚀 Backend rodando em http://localhost:3001
```

#### 2. Frontend (A Face)

```bash
# Volte para a raiz e entre na pasta do projeto (se necessário)
cd ..

# Instale as dependências
npm install

# Configure as variáveis de ambiente
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Inicie o frontend
npm run dev
# 🎨 Frontend rodando em http://localhost:5173
```

---

### 📚 Uso da API

A API do Chrono é RESTful e protegida por tokens JWT.

**Exemplo de Rota: Criar um Post**

```http
POST /api/posts
Authorization: Bearer <seu_token_aqui>
Content-Type: application/json

{
  "content": "Hackeando a timeline... #ChronoLaunch",
  "isPrivate": false
}
```

> **Dica:** Confira a documentação completa das rotas na pasta `/server/routes`.

---

### 🤝 Contribuindo

Quer ajudar a construir o futuro das redes sociais?

1.  Faça um **Fork** do projeto.
2.  Crie uma Branch para sua feature (`git checkout -b feature/NovaFuncionalidade`).
3.  Commit suas mudanças (`git commit -m 'Adiciona NovaFuncionalidade'`).
4.  Push para a Branch (`git push origin feature/NovaFuncionalidade`).
5.  Abra um **Pull Request**.

---

<div align="center">
  <sub>Desenvolvido com 💜 e muita cafeína por <a href="https://github.com/Juvinho">Juvinho</a>.</sub>
</div>

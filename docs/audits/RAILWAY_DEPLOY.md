# 🚂 Guia de Deploy no Railway

## ✅ Problemas Corrigidos

1. **Duplicação do PaperPlaneIcon** - Removida duplicata que impedia o build
2. **Arquivos de Configuração** - Criados `railway.json` e `nixpacks.toml`

## 📋 Configuração no Railway

### 1. Variáveis de Ambiente Necessárias

No painel do Railway, adicione estas variáveis em **Variables**:

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=sua-chave-secreta-super-segura-aqui
JWT_EXPIRES_IN=7d

# Servidor
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://seu-dominio.railway.app
FRONTEND_URL=https://seu-dominio.railway.app

# Email (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-app-password
```

### 2. Configurações do Serviço

No Railway, configure:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `.` (raiz do projeto)

### 3. Porta

O Railway automaticamente define a variável `PORT`. Certifique-se de que seu código usa `process.env.PORT || 3001`.

## 🔧 Arquivos de Configuração Criados

### `railway.json`
Configura o build e deploy no Railway.

### `nixpacks.toml`
Configuração alternativa usando Nixpacks (se Railway usar).

## 🚀 Processo de Deploy

1. **Conecte o Repositório GitHub**
   - No Railway, vá em **New Project** > **Deploy from GitHub repo**
   - Selecione `Juvinho/Chrono`

2. **Configure as Variáveis**
   - Vá em **Variables** e adicione todas as variáveis listadas acima

3. **Deploy Automático**
   - O Railway fará o build automaticamente quando você fizer push
   - O build executa: `npm install && npm run build`
   - O start executa: `npm start`

4. **Verificar Logs**
   - Vá em **Deployments** > **View Logs** para ver o progresso
   - Procure por erros de build ou runtime

## ⚠️ Troubleshooting

### Build Falha
- Verifique se todas as dependências estão no `package.json`
- Veja os logs do Railway para erros específicos

### Aplicação não Inicia
- Verifique se `DATABASE_URL` está configurada corretamente
- Verifique se a porta está sendo usada corretamente
- Veja os logs de runtime no Railway

### Erro de Conexão com Banco
- Verifique se `DATABASE_URL` está no formato correto
- Certifique-se de que o banco está acessível do Railway

## 📝 Notas Importantes

- O Railway usa a porta definida na variável `PORT` automaticamente
- O build cria tanto o frontend quanto o backend
- O servidor serve o frontend estático da pasta `server/dist/public`
- Certifique-se de que o banco de dados está configurado antes do deploy

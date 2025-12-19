# 🧹 Como Limpar o localStorage

O frontend ainda está usando localStorage para armazenar usuários. Mesmo limpando o banco de dados, você precisa limpar o localStorage do navegador.

## Método 1: Console do Navegador (Mais Rápido)

1. **Abra o navegador** (onde o site está rodando)
2. **Pressione F12** para abrir as ferramentas de desenvolvedor
3. **Vá para a aba "Console"**
4. **Cole e execute este comando:**

```javascript
localStorage.removeItem('chrono_users_v2');
localStorage.removeItem('chrono_currentUser_v2');
localStorage.removeItem('chrono_posts_v2');
localStorage.removeItem('chrono_conversations_v2');
console.log('✅ LocalStorage limpo!');
```

5. **Recarregue a página** (F5)

## Método 2: Limpar Tudo do Site

No console do navegador (F12 → Console), execute:

```javascript
localStorage.clear();
console.log('✅ Todo o localStorage foi limpo!');
location.reload();
```

## Método 3: DevTools → Application

1. **Pressione F12** para abrir DevTools
2. **Vá para a aba "Application"** (ou "Aplicativo")
3. **No menu lateral**, expanda **"Local Storage"**
4. **Clique em** `http://localhost:5173`
5. **Delete os itens:**
   - `chrono_users_v2`
   - `chrono_currentUser_v2`
   - `chrono_posts_v2`
   - `chrono_conversations_v2`
6. **Recarregue a página**

## ✅ Depois de Limpar

Agora você pode:
1. Registrar uma nova conta
2. O username não estará mais "em uso"
3. Tudo começará do zero


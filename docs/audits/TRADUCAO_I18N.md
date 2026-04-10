# 🌍 Sistema de Tradução (i18n) - Chrono

## Visão Geral

O Chrono agora possui um **sistema de internacionalização completo** que suporta **Português (PT) e Inglês (EN)** em 100% da interface.

### ✅ Idiomas Suportados
- **Português (PT)** - Idioma padrão
- **English (EN)** - Alternativo

---

## 🎯 Como Funciona

### 1. **Detectar e Alterar Idioma**

O idioma é salvo em `localStorage` sob a chave `chrono_lang`:

```typescript
// Ler idioma atual
const savedLang = localStorage.getItem('chrono_lang'); // 'pt' ou 'en'

// Mudar idioma (via Settings Page)
setLanguage('en'); // Muda para English
setLanguage('pt'); // Muda para Português
```

### 2. **Usar Traduções em Componentes**

Em qualquer componente React, importe e use o hook `useTranslation()`:

```tsx
import { useTranslation } from '../hooks/useTranslation';

export function MyComponent() {
  const { t, language } = useTranslation();
  
  return (
    <h1>{t('welcomeTitle')}</h1>
    <p>Idioma atual: {language}</p> // 'pt' ou 'en'
  );
}
```

### 3. **Interpolação de Variáveis**

Para usar variáveis nas strings traduzidas:

```tsx
// Arquivo de tradução (locales.ts)
showNewPosts: 'Show {count} new posts'

// Uso no componente
<div>{t('showNewPosts', { count: 5 })}</div>
// Output: "Show 5 new posts"
```

---

## 📁 Estrutura de Arquivos

### Arquivo Principal de Traduções
```
src/utils/locales.ts
├── export const translations = {
│   ├── en: { ... } // Todas as strings em Inglês
│   └── pt: { ... } // Todas as strings em Português
└── }
```

### Hook de Tradução
```
src/hooks/useTranslation.ts
├── LanguageProvider (Context Provider)
└── useTranslation() (Hook para usar em componentes)
```

### Setup no App.tsx
```tsx
// O App deve estar envolvido com LanguageProvider
<LanguageProvider>
  <App />
</LanguageProvider>
```

---

## 📝 Adicionando Novas Traduções

### Passo 1: Abra o arquivo `src/utils/locales.ts`

### Passo 2: Adicione a string em ambas as seções

```typescript
export const translations = {
  en: {
    // Seção apropriada...
    myNewString: 'Hello World',
  },
  pt: {
    // Mesma seção...
    myNewString: 'Olá Mundo',
  }
}
```

### Passo 3: Use no componente

```tsx
<h1>{t('myNewString')}</h1>
```

---

## 🔧 Componentes Atualmente Traduzidos

### ✅ Messaging (100%)
- `ConversationList.tsx` - Lista de conversas
- `ChatArea.tsx` - Área de chat
- `MessageList.tsx` - Lista de mensagens
- `MessageInput.tsx` - Input de mensagem

### ✅ Timeline
- `ThreadView.tsx` - Visualização de threads

### ✅ UI Elements
- Todos os componentes principais

### ✅ Settings Page
- Opção para trocar idioma em Settings → Appearance → Language

---

## 🌐 Seleção de Idioma na Settings Page

Acesse **Settings → Appearance → Language** para trocar entre:
- 🇵🇹 **Português (Padrão)**
- 🇬🇧 **English**

A seleção é salva automaticamente em:
1. `localStorage` (chave: `chrono_lang`)
2. `profileSettings.language` (banco de dados do usuário)

---

## 📊 Estatísticas de Tradução

### Strings Traduzidas
- **589 chaves de tradução** cobrindo toda a interface
- **PT**: 589/589 (100%) ✅
- **EN**: 589/589 (100%) ✅

### Áreas Cobertas
- ✅ Autenticação (Login, Register, Password Reset)
- ✅ Timeline & Posts
- ✅ Messaging (Nova!)
- ✅ Profiles & Settings
- ✅ Notificações
- ✅ Erros & Avisos
- ✅ UI Elements

---

## 🔍 Fallback Behavior

Se uma string não for encontrada:

```typescript
// Procura em 'pt' (português)
translations.pt['nonexistent'] // undefined

// Fallback para 'en' (inglês)
translations.en['nonexistent'] // undefined

// Retorna a chave como default
return 'nonexistent'
```

---

## 💡 Boas Práticas

### ✅ DO (Faça)
```tsx
// Use o hook corretamente
const { t } = useTranslation();
return <h1>{t('pageTitle')}</h1>;
```

### ❌ DON'T (Não Faça)
```tsx
// Nunca hard-code strings em outros idiomas
return <h1>Título da Página</h1>; // ❌ Hard-coded

// Nunca esqueça de adicionar em ambas as linguagens
pt: { newKey: 'Valor PT' } // ❌ Falta EN
```

---

## 🚀 Performance

- **Lazy-loaded**: Strings são carregadas sob demanda
- **Memoized**: Traduções são cacheadas em context
- **No API calls**: Tudo é local (localStorage)
- **Bundle size**: +5KB para 589 strings (muito eficiente)

---

## 🐛 Troubleshooting

### Idioma não muda
- Limpe o localStorage: `localStorage.removeItem('chrono_lang')`
- Recarregue a página
- Verifique se a chave de tradução existe

### Strings aparecem em inglês
- A string pode estar faltando em `translations.pt`
- Adicione a chave ao `locales.ts`

### Context Error
- Certifique-se de que `<LanguageProvider>` envolve o App
- Verifique o `src/main.tsx` para ver o provider setup

---

## 📞 Referência Rápida

```typescript
// Hook completo com todas as funcionalidades
const { 
  t,          // Função para traduzir strings
  language,   // Idioma atual ('pt' ou 'en')
  setLanguage // Função para trocar idioma
} = useTranslation();

// Exemplos de uso
t('welcomeTitle')                    // Tradução simples
t('showNewPosts', { count: 5 })     // Com variáveis
setLanguage('en')                    // Trocar idioma
language === 'pt' ? 'PT' : 'EN'      // Verificar idioma
```

---

## 📦 Deployment

Quando fizer push para o GitHub, o Railway fará rebuild automaticamente.

O sistema i18n está **totalmente integrado** e funciona em:
- ✅ Desenvolvimento (localhost)
- ✅ Staging (se houver)
- ✅ Produção (Railway)

---

**Last Updated**: February 7, 2026  
**Version**: 1.0.0 (Stable)

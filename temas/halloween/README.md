# 🎃 Halloween Aero Theme

Tema Halloween estilo Aero Glass para a plataforma social Chrono.

## 📋 Estrutura

```
halloween/
├── halloween-theme.css          # CSS principal do tema
├── halloween-animations.css     # Animações (morcegos, neblina, glow)
├── halloween-injector.js        # Injetor de elementos decorativos
├── halloween-config.json        # Configurações do tema
├── assets/                      # Pasta para imagens e SVGs
│   ├── bg-cemetery.webp         # Background do cemitério
│   ├── bat-1.svg                # Morcego sprite 1
│   ├── bat-2.svg                # Morcego sprite 2
│   ├── bat-3.svg                # Morcego sprite 3
│   ├── pumpkin-left.webp        # Abóbora esquerda
│   ├── pumpkin-right.webp       # Abóbora direita
│   ├── cobweb-corner.svg        # Teia de aranha
│   └── fog-layer.webp           # Camada de neblina
└── README.md                    # Este arquivo
```

## 🎨 Características

- ✨ Efeito Aero Glass com blur backdrop
- 🦇 Morcegos animados voando
- 🎃 Abóboras (Jack-o'-lanterns) com brilho
- 🕷️ Teias de aranha nos cantos
- 🌫️ Efeito de neblina animada
- 🌙 Paleta de cores Halloween (laranja e preto)
- 📱 Design responsivo
- 🎯 Compatível com qualquer navegador moderno

## 🚀 Como Usar

### 1. Ativar o Tema

Adicione a classe `theme-halloween` ao elemento `<body>`:

```html
<body class="theme-halloween">
  ...
</body>
```

### 2. Importar CSS

No seu arquivo CSS principal:

```css
@import './temas/halloween/halloween-theme.css';
@import './temas/halloween/halloween-animations.css';
```

Ou em um arquivo JavaScript/TypeScript:

```javascript
import './temas/halloween/halloween-theme.css';
import './temas/halloween/halloween-animations.css';
import './temas/halloween/halloween-injector.js';
```

### 3. Adicionar Assets

Coloque os arquivos de imagem na pasta `assets/`:

| Arquivo | Descrição | Tamanho |
|---------|-----------|--------|
| `bg-cemetery.webp` | Background cemitério | 1920×1080 |
| `bat-1.svg` | Morcego sprite 1 | SVG |
| `bat-2.svg` | Morcego sprite 2 | SVG |
| `bat-3.svg` | Morcego sprite 3 | SVG |
| `pumpkin-left.webp` | Abóbora esquerda | 200×200 |
| `pumpkin-right.webp` | Abóbora direita | 180×180 |
| `cobweb-corner.svg` | Teia de aranha | SVG |

## 🎛️ Configuração

Edite `halloween-config.json` para personalizar:

```json
{
  "features": {
    "animated_bats": true,      // Ativar morcegos
    "fog_effect": true,         // Efeito de neblina
    "pumpkin_decorations": true,// Abóboras
    "cobwebs": true,            // Teias
    "glow_borders": true,       // Brilho nos cards
    "aero_glass": true          // Efeito blur
  },
  "schedule": {
    "auto_activate": "10-01",   // Ativar 1º de outubro
    "auto_deactivate": "11-05"  // Desativar 5 de novembro
  }
}
```

## 🔧 Customização

### Cores

Edite as cores em `halloween-theme.css`:

```css
--primary-orange: #ff8c00;      /* Laranja primário */
--glow-color: rgba(255, 140, 0, 0.3);  /* Cor do brilho */
--bg-dark: #0a1a1a;            /* Fundo escuro */
```

### Animações

Ajuste as animações em `halloween-animations.css`:

```css
animation: batFly1 8s ease-in-out infinite;  /* Duração dos voos */
animation: fogDrift 20s ease-in-out infinite;  /* Duração da neblina */
```

## 📦 Assets Necessários

Você pode encontrar assets gratuitos em:

- [SVGRepo](https://www.svgrepo.com) - Morcegos e teias SVG
- [Freepik](https://freepik.com) - Imagens Halloween
- [Pixabay](https://pixabay.com) - Fotos de cemitério

**Termos de busca:**
- "halloween bat svg"
- "jack o lantern png"
- "spider web svg"
- "cemetery background"

## ✅ Checklist de Implementação

- [ ] CSS importado no projeto
- [ ] Classe `theme-halloween` adicionada ao `<body>`
- [ ] Assets baixados e colocados em `assets/`
- [ ] JavaScript injector importado
- [ ] Testado em navegadores (Chrome, Firefox, Safari, Edge)
- [ ] Responsividade testada em mobile

## 🐛 Troubleshooting

### Imagens não aparecem
- Verifique os caminhos em `halloween-injector.js`
- Certifique-se que os arquivos existem em `assets/`

### Animações travando
- Reduza a opacidade em `halloween-animations.css`
- Diminua a quantidade de partículas em `halloween-injector.js`

### Blur não funciona (Safari)
- Use `-webkit-backdrop-filter` (já incluído)
- Atualize o navegador para versão recente

## 📄 Licença

Este tema é fornecido como está. Use livremente em seus projetos.

---

**Criado em:** Março 2026  
**Versão:** 1.0.0  
**Tema por:** Chrono Team

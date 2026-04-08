# Assets do Tema Halloween

Esta pasta deve conter os seguintes arquivos de imagem:

## Imagens Necessárias

### Background
- **bg-cemetery.webp** - Imagem de fundo do cemitério (1920×1080, ~200KB)

### Morcegos (SVG)
- **bat-1.svg** - Morcego com asas abertas
- **bat-2.svg** - Morcego com asas na posição média
- **bat-3.svg** - Morcego com asas fechadas

### Abóboras (WebP/PNG)
- **pumpkin-left.webp** - Jack-o'-lantern lado esquerdo (200×200)
- **pumpkin-right.webp** - Jack-o'-lantern lado direito (180×180)

### Decorações (SVG)
- **cobweb-corner.svg** - Teia de aranha para cantos

### Opcional
- **fog-layer.webp** - Camada de neblina (1920×400)

## Onde Encontrar Assets

- **Morcegos SVG:** [SVGRepo](https://www.svgrepo.com), [Flaticon](https://www.flaticon.com)
- **Abóboras:** [Freepik](https://freepik.com), [Pixabay](https://pixabay.com)
- **Teias de Aranha:** [SVGRepo](https://www.svgrepo.com)
- **Backgrounds:** [Pixabay](https://pixabay.com), [Unsplash](https://unsplash.com)

## Otimização

### WebP (Recomendado)
Use WebP para melhor compressão:
```bash
cwebp -q 80 imagem.png -o imagem.webp
```

### SVG
Use SVG para ícones e gráficos vetoriais (escaláveis sem perda de qualidade)

## Verificação

Após adicionar os arquivos, verifique se os caminhos em `halloween-injector.js` correspondem aos nomes dos arquivos.

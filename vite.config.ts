import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // ← adicionar isso
  ],
  base: '/',  // ← CRÍTICO: deve ser '/' para Cloudflare Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // seu backend local
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})

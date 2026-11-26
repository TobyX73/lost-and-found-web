import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo el front llama a /api y Vite lo reenvía a la API de Nest,
    // así no dependemos de CORS ni de puertos en el código.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

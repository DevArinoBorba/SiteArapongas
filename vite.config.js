import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        timeout: 120000, // 2 minutos
        proxyTimeout: 120000 
      },
      "/uploads": "http://localhost:3001",
    },
  },
})

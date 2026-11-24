import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The server listens on loopback only; the dev proxy keeps the browser same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } },
  },
})

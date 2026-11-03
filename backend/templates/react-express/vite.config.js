import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = Number(process.env.PORT) || 4200
const apiPort = Number(process.env.API_PORT) || port + 1

// Dev server proxies API calls to the Express backend so the frontend can use
// relative /api/* URLs in both development and production.
const proxy = { '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: { host: true, port, strictPort: false, proxy },
  preview: { host: true, port, strictPort: false, proxy },
})

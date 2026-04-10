import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,       // Expose on network (0.0.0.0) - accessible from phone/other devices
    port: 5173,       // Fixed port
    open: true,       // Auto-open in browser
    strictPort: false, // Use next available port if 5173 is busy
  },
})

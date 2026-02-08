import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/infinity-api': {
        target: 'https://api.infinity.inc/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/infinity-api/, ''),
      },
    },
  },
})

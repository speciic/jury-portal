import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      // Force Vite to use OUR copy of React, not the parent's
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  server: {
    port: 5173,
    proxy: {
      // In dev: forward /api calls to the Firebase Functions emulator
      '/api': {
        target: 'http://localhost:5001/jury-f8b6a/us-central1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/generate-resume': 'http://localhost:3001',
      '/generate-cover-letter': 'http://localhost:3001',
      '/generate-star-answers': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/logs': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
})

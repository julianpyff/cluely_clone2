import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Ensure environment variables are available at build time
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY)
  }
})
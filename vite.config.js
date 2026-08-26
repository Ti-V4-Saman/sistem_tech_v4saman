import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Encaminha chamadas /api para o backend durante o desenvolvimento
      // Isso elimina erros de CORS sem precisar de configuração extra
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/mammoth') || id.includes('node_modules/jszip') || id.includes('node_modules/pako')) return 'docx-parser';
          if (id.endsWith('/src/data.js')) return 'mock-data';
        },
      },
    },
  },
})

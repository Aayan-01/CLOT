import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Ensures relative asset paths for static hosting
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_ORIGIN || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
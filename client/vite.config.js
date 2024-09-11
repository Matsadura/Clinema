// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/weather': {
        target: 'http://localhost:5000', // Your Flask server URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/weather/, '/weather'),
      },
    },
  },
});

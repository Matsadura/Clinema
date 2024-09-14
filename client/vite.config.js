// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/weather': {
          target: 'http://localhost:5000', // Your Flask server URL
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/weather/, ''),
        },
      },
    },
    define: {
      'process.env': process.env,
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
      'process.env.REACT_APP_TMDB_API_KEY': JSON.stringify(env.REACT_APP_TMDB_API_KEY),
    },
  };
});

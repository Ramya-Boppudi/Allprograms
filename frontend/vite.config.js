import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, '');
  const port = parseInt(env.VITE_FRONTEND_PORT || '3010', 10);
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8013';
  const base = env.VITE_APP_BASE || '/grievance/';

  return {
    envDir,
    base: base.endsWith('/') ? base : `${base}/`,
    plugins: [react()],
    server: {
      port,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/uploads': {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});

import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
    return {
      base: process.env.BASE_PATH || '/ccd/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
              if (id.includes('/motion/') || id.includes('\\motion\\') || id.includes('framer-motion')) return 'motion';
              // react + react-dom (+ scheduler) vendor chunk
              if (
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules\\react-dom') ||
                id.includes('node_modules/react/') ||
                id.includes('node_modules\\react\\') ||
                id.includes('node_modules/scheduler') ||
                id.includes('node_modules\\scheduler')
              ) {
                return 'react-vendor';
              }
            }
          }
        }
      }
    };
});

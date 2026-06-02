import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

let buildRev = 'dev';
try { buildRev = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}

// Production deploys to /quiz/; local dev runs at root /.
// Set VITE_BASE=/other/ to override for a different subpath.
const base = process.env.VITE_BASE
  ?? (process.env.NODE_ENV === 'production' ? '/quiz/' : '/');

export default defineConfig({
  base,
  define: {
    __BUILD_REV__: JSON.stringify(buildRev),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Don't generate a second manifest — we use public/manifest.json directly.
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/*.png', 'questions_*.json'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/quiz/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-quiz-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

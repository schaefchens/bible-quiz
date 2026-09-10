import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

let buildRev = 'dev';
try { buildRev = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}

export default defineConfig({
  // The app owns the root of its own subdomain, in dev and in production alike.
  // (It used to build to /quiz/ on the retired komm-folge-mir-nach.de host.)
  base: '/',
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
        // public/ carries the PHP backend's own files into dist, but only the
        // frontend half is uploaded to the web root. Precaching the rest would
        // point the service worker at URLs that 404 and fail its install.
        globIgnores: ['published/**', 'qcache/**'],
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
            urlPattern: /\/api\/(questions|quizzes)\.php/,
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
      // The client always calls /api/<file>.php (see API_BASE in App.jsx). In
      // production that is the real PHP folder; here we map those same URLs onto
      // the Node dev server's routes, so dev and production never diverge.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (url) => {
          const [path, search = ''] = url.split('?');
          const params = new URLSearchParams(search);

          if (path.endsWith('/questions.php')) {
            const qs = params.toString();
            return '/api/quiz' + (qs ? `?${qs}` : '');
          }
          if (path.endsWith('/quizzes.php')) {
            const id = params.get('download');
            return id
              ? `/api/quiz-download/${encodeURIComponent(id)}`
              : '/api/quizzes';
          }
          return url; // already a native Node route
        },
      },
    },
  },
});

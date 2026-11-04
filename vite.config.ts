import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        includeAssets: [
          'manifest.json',
          'notification.ogg',
          'icon-192x192.png',
          'icon-512x512.png',
          'robots.txt',
          'sitemap.xml',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,ogg,json}'],
          globIgnores: ['**/server.cjs*', '**/node_modules/**/*'],
          maximumFileSizeToCacheInBytes: 4000000,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null,
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
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdnjs-cache',
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cloudinary-logo-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/unpkg\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'unpkg-cache',
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          about: path.resolve(__dirname, 'about.html'),
          appointment: path.resolve(__dirname, 'appointment.html'),
          contact: path.resolve(__dirname, 'contact.html'),
          services: path.resolve(__dirname, 'services.html'),
          specialties: path.resolve(__dirname, 'specialties.html'),
          team: path.resolve(__dirname, 'team.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          doctor: path.resolve(__dirname, 'doctor.html'),
          suivi: path.resolve(__dirname, 'suivi.html'),
          mentionsLegales: path.resolve(__dirname, 'mentions-legales.html'),
          confidentialite: path.resolve(__dirname, 'confidentialite.html'),
          presentation: path.resolve(__dirname, 'presentation.html'),
          notFound: path.resolve(__dirname, '404.html'),
        },
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            react: ['react', 'react-dom'],
            vendor: ['@google/generative-ai', '@emailjs/browser'],
          },
        },
      },
    },
  };
});

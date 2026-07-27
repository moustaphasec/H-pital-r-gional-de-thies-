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
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
          maximumFileSizeToCacheInBytes: 4000000
        },
        manifest: {
          name: 'Hôpital Régional de Thiès',
          short_name: 'Hôpital Thiès',
          description: 'Plateforme de gestion de l\'Hôpital Régional de Thiès',
          theme_color: '#2563EB',
          background_color: '#F8FAFC',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
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
          },
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            react: ['react', 'react-dom'],
            vendor: ['@google/generative-ai', '@emailjs/browser']
          }
        }
      },
    },
  };
});

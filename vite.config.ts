import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      },
    },
  };
});

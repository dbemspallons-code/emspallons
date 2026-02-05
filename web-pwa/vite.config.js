import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Assurez-vous que le base path est correct
  publicDir: 'public', // S'assurer que le dossier public est copié
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
    // Assurez-vous que les assets sont générés avec des chemins relatifs
    assetsDir: 'assets',
    // Copier les fichiers du dossier public
    copyPublicDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
})
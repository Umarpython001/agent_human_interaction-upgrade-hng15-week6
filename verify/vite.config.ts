import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built bundle also runs from file:// URLs (screenshot capture).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

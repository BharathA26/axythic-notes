import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  // CRITICAL: Chrome extensions require relative paths (not absolute "/")
  base: '',
  plugins: [
    react(),
    webExtension({
      manifest: 'public/manifest.json',
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

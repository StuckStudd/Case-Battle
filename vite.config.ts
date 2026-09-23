import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths let dist/ work on any static host or sub-folder (GitHub Pages, Netlify, etc.).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // The skin catalog (~1900 skins with per-wear prices) is one ~800 kB chunk, ~250 kB gzipped.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'catalog', test: /src[\\/]data[\\/]catalog\.ts/ }],
        },
      },
    },
  },
});

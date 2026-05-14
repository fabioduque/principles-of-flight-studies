import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Set SINGLE_FILE=1 to inline JS + CSS into one HTML file (npm run build:single).
const singleFile = !!process.env.SINGLE_FILE;

export default defineConfig({
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  base: './',
  build: singleFile
    ? {
        // Make every asset inline, don't split chunks
        assetsInlineLimit: 100_000_000,
        cssCodeSplit: false,
        rollupOptions: {
          output: { inlineDynamicImports: true },
        },
      }
    : undefined,
  test: {
    globals: true,
    environment: 'node',
  },
});

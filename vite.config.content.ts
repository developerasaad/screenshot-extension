/**
 * Vite config for the content script only.
 * Must be IIFE (not ESM) because it is injected via chrome.scripting.executeScript,
 * which does not support ES module syntax.
 */
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: 'src',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false, // Don't wipe the dist from the main build
    minify: mode === 'production',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        'content/content-main': resolve(__dirname, 'src/content/content-main.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',   // <-- Self-contained, no import statements
        inlineDynamicImports: false,
      },
    },
    target: 'chrome112',
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@capture': resolve(__dirname, 'src/capture'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
  // Don't re-copy public/ here — main build handles it
  publicDir: false,
}));

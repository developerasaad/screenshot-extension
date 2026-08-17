/**
 * Main Vite config.
 * Builds: service-worker (ESM), viewer (ESM + HTML), offscreen (ESM + HTML).
 * The content script is built separately via vite.config.content.ts as IIFE.
 */
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: 'src',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    minify: mode === 'production',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'viewer/viewer': resolve(__dirname, 'src/viewer/viewer.html'),
        'offscreen/offscreen': resolve(__dirname, 'src/offscreen/offscreen.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some(n => n.endsWith('.css'))) {
            return 'viewer/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
        format: 'esm',
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
  publicDir: resolve(__dirname, 'public'),
}));

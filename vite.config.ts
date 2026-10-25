import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import fs from 'node:fs';

export default defineConfig({
  // Use relative base so script & link tags in dist/newtab.html use './assets/...'
  base: './',

  plugins: [
    {
      name: 'foxlaunch-manifest-emitter',
      generateBundle() {
        // Reads manifest.json from project root and emits it into dist/manifest.json
        const manifestPath = resolve(__dirname, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          this.emitFile({
            type: 'asset',
            fileName: 'manifest.json',
            source: fs.readFileSync(manifestPath, 'utf-8'),
          });
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'newtab.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});

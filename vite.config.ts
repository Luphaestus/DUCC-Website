import { defineConfig } from 'vite';
import { resolve } from 'path';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(({ mode }) => ({
  root: 'src/client',
  publicDir: resolve(__dirname, 'public'),
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '/js': resolve(__dirname, 'src/client'),
      '@': resolve(__dirname, 'src/client'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [resolve(__dirname, 'node_modules/@picocss/pico/scss')],
      },
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    minify: mode === 'production',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/client/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'vendor-three';
            }
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-tiptap';
            }
            return 'vendor';
          }
        }
      }
    },
  },
}));
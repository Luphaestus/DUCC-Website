import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/client',
  publicDir: 'public',
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
    outDir: '../../public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/client/index.html'),
      },
    },
  },
});
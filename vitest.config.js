import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    include: ['tests/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['default'],
    server: {
      deps: {
        inline: [/solid-js/, /@solidjs\/router/],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/client'),
      '/js': resolve(__dirname, './src/client'),
    },
    conditions: ['development', 'browser'],
  },
});

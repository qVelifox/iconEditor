import { defineConfig } from 'vite';

export default defineConfig({
  base: '/iconEditor/',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: '/griff/',
  build: { outDir: '../dist', emptyOutDir: true },
});

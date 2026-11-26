import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// build of the demonstration site (GitHub Pages)
export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, '../dist-site'),
    emptyOutDir: true
  }
});

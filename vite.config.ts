import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const projectRoot = import.meta.dirname;

export default defineConfig({
    base: './',
    publicDir: false,
    plugins: [
      preact(),
    ],
    resolve: {
      alias: {
        '@content-index': resolve(projectRoot, '.content-build/public/split/index.json'),
        '@content-chunks': resolve(projectRoot, '.content-build/public/split/chunks.ts'),
      },
    },
    build: {
      outDir: '.next-ui',
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(projectRoot, 'index.html'),
      },
    },
});

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const projectRoot = import.meta.dirname;

export default defineConfig({
    base: './',
    publicDir: false,
    plugins: [
      preact({ exclude: [/node_modules/, /\/vendor\//] }),
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
      rolldownOptions: {
        output: {
          // Das Familien-Subsystem haengt komplett hinter der lazy
          // FamilyExerciseView. Prozedurale Einzel-Module wachsen mit jeder
          // migrierten Familie; sie bleiben je Familien-Praefix in eigenen
          // Lazy-Chunks unter dem 250-KiB-gzip-Budget, die grossen
          // Generator-/Familien-Dateien in family-core.
          advancedChunks: {
            includeDependenciesRecursively: false,
            groups: [
              {
                test: /core\/procedural\//,
                name: (id) => {
                  const match = /core\/procedural\/([a-z]+)-/.exec(id);
                  return match ? `procedural-${match[1]}` : null;
                },
              },
              {
                name: 'family-core',
                test: /assets\/js\/core\/[^/]*(generators|_families)\.mjs$/,
              },
            ],
          },
        },
      },
    },
});

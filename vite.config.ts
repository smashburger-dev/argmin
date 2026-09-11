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
                // Bank-JSONs gehoeren zum selben Lazy-Chunk wie ihre
                // Generator-Familie (familyId-Praefix), sonst zieht die
                // FamilyExerciseView alle Bänke in ihren eigenen Chunk.
                test: /content\/banks\//,
                name: (id) => {
                  const match = /content\/banks\/([a-z]+)-/.exec(id);
                  return match ? `procedural-${match[1]}` : 'content-banks';
                },
              },
              {
                // Alles, wovon die Familien-Laufzeit gegenseitig abhaengt,
                // gehoert in EINEN Chunk: die Zyklen family_registry ->
                // graders -> linalg_generators und draw_kit <-> generators
                // duerfen keine Chunk-Grenzen schneiden (TDZ-Absturz:
                // "x is not a function" im gebauten Preview).
                name: 'family-core',
                test: /assets\/js\/(core\/[^/]*(generators|_families|generator_draw_kit|graders)\.m?js|domain\/family_registry\.mjs)$/,
              },
            ],
          },
        },
      },
    },
});

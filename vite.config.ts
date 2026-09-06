import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

const LIBRARY_MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function localLibraryPath(projectRoot: string, rawUrl: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(rawUrl.split('?')[0] ?? '');
  } catch {
    return null;
  }
  if (!pathname.startsWith('/library/') && !pathname.startsWith('/library-private/')) return null;
  const absolute = resolve(projectRoot, `.${pathname}`);
  const rel = relative(projectRoot, absolute).replaceAll('\\', '/');
  if (rel.startsWith('..') || (!rel.startsWith('library/') && !rel.startsWith('library-private/'))) return null;
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return null;
  return absolute;
}

function serveLocalLibrary(projectRoot: string): Plugin {
  return {
    name: 'serve-local-library',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = localLibraryPath(projectRoot, req.url ?? '');
        if (!file) {
          next();
          return;
        }
        const mime = LIBRARY_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
        res.setHeader('content-type', mime);
        res.setHeader('content-length', String(statSync(file).size));
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const contentProfile = mode === 'local-private' ? 'local-private' : 'public';
  const projectRoot = import.meta.dirname;
  return {
    base: './',
    publicDir: false,
    plugins: [
      preact(),
      ...(contentProfile === 'local-private' ? [serveLocalLibrary(projectRoot)] : []),
    ],
    resolve: {
      alias: {
        '@content-index': resolve(projectRoot, `.content-build/${contentProfile}/split/index.json`),
        '@content-chunks': resolve(projectRoot, `.content-build/${contentProfile}/split/chunks.ts`),
      },
    },
    build: {
      outDir: '.next-ui',
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(projectRoot, 'index.html'),
      },
    },
  };
});

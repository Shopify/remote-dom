import fs from 'node:fs';
import type {ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vite';
import {resolveServedWptFile} from './src/paths.ts';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(packageRoot, 'fixtures');
const wptRoot = process.env.WPT_ROOT
  ? path.resolve(process.env.WPT_ROOT)
  : undefined;

function sendText(response: ServerResponse, status: number, text: string) {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(text);
}

function wptFilesPlugin(): Plugin {
  return {
    name: 'wpt-files',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url) return next();
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname !== '/__wpt-file') return next();

        const file = resolveServedWptFile(url.searchParams.get('path'), {
          fixtureRoot,
          wptRoot,
        });
        if (!file) return sendText(response, 400, 'Invalid WPT path.');
        const stat = fs.statSync(file, {throwIfNoEntry: false});
        if (!stat?.isFile())
          return sendText(response, 404, `Missing WPT file: ${file}`);

        response.statusCode = 200;
        response.setHeader('content-type', 'text/plain; charset=utf-8');
        fs.createReadStream(file).pipe(response);
      });
    },
  };
}

export default defineConfig({
  plugins: [wptFilesPlugin()],
  resolve: {
    conditions: ['quilt:source'],
  },
  server: {
    host: '127.0.0.1',
    fs: {
      allow: [packageRoot, fixtureRoot, ...(wptRoot ? [wptRoot] : [])],
    },
  },
  define: {
    __WPT_ROOT__: JSON.stringify(wptRoot ?? 'not prepared'),
  },
});

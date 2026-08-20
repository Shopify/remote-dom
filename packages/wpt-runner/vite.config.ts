import fs from 'node:fs';
import type {ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vite';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(packageRoot, 'fixtures');
const wptRoot = process.env.WPT_ROOT
  ? path.resolve(process.env.WPT_ROOT)
  : undefined;

export function resolveServedWptFile(
  rawPath: string | null,
  {fixtureRoot, wptRoot}: {fixtureRoot: string; wptRoot?: string},
) {
  if (!rawPath || rawPath.includes('\\') || path.posix.isAbsolute(rawPath)) {
    return null;
  }
  const segments = rawPath.split('/');
  if (segments.some((segment) => segment === '..' || segment === '')) {
    return null;
  }

  if (rawPath.startsWith('__runner__/')) {
    return containedPath(fixtureRoot, rawPath.slice('__runner__/'.length));
  }
  return wptRoot ? containedPath(wptRoot, rawPath) : null;
}

function containedPath(root: string, relativePath: string) {
  const realRoot = fs.realpathSync.native(root);
  const candidate = path.resolve(realRoot, relativePath);
  if (!isContainedPath(realRoot, candidate)) return null;

  try {
    const realCandidate = fs.realpathSync.native(candidate);
    return isContainedPath(realRoot, realCandidate) ? realCandidate : null;
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }
}

function isContainedPath(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`))
  );
}

function isMissingPathError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

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
          return sendText(response, 404, 'Missing WPT file.');

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

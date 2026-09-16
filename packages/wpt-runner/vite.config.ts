import fs from 'node:fs';
import type {ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin, type UserConfig} from 'vite';
import {parseCapabilities, rowsByPath} from './scripts/capabilities.ts';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const capabilitiesPath = path.join(packageRoot, 'capabilities.tsv');
const capabilityPaths = [
  ...rowsByPath(
    parseCapabilities(fs.readFileSync(capabilitiesPath, 'utf8')),
  ).keys(),
];
const fixtureRoot = path.join(packageRoot, 'fixtures');
const wptRoot = process.env.WPT_ROOT
  ? path.resolve(process.env.WPT_ROOT)
  : undefined;

export const workerContentSecurityPolicy: string = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'",
  "connect-src 'none'",
  "worker-src 'none'",
  "child-src 'none'",
].join('; ');

export function isRunnerWorkerRequest(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  const url = new URL(rawUrl, 'http://localhost');
  return (
    url.pathname === '/src/worker.ts' &&
    url.searchParams.has('worker_file') &&
    url.searchParams.get('type') === 'module'
  );
}

/** Resolves a fixture or WPT file without allowing escapes from its root. */
export function resolveServedWptFile(
  rawPath: string | null,
  {fixtureRoot, wptRoot}: {fixtureRoot: string; wptRoot?: string},
): string | null {
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

function createFileEtag({size, mtimeMs}: fs.Stats): string {
  return `W/"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`;
}

function sendText(response: ServerResponse, status: number, text: string) {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(text);
}

/** Serves WPT sources and applies the worker's restrictive CSP. */
function wptFilesPlugin(): Plugin {
  return {
    name: 'wpt-files',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url) return next();
        if (isRunnerWorkerRequest(request.url)) {
          response.setHeader(
            'content-security-policy',
            workerContentSecurityPolicy,
          );
          return next();
        }

        const url = new URL(request.url, 'http://localhost');
        if (url.pathname !== '/__wpt-file') return next();

        const file = resolveServedWptFile(url.searchParams.get('path'), {
          fixtureRoot,
          wptRoot,
        });
        if (!file) return sendText(response, 400, 'Invalid WPT path.');
        const stat = fs.statSync(file, {throwIfNoEntry: false});
        if (!stat?.isFile()) {
          return sendText(response, 404, 'Missing WPT file.');
        }

        const etag = createFileEtag(stat);
        response.setHeader('cache-control', 'no-cache');
        response.setHeader('etag', etag);
        if (request.headers['if-none-match'] === etag) {
          response.statusCode = 304;
          response.end();
          return;
        }

        response.statusCode = 200;
        response.setHeader('content-type', 'text/plain; charset=utf-8');
        fs.createReadStream(file).pipe(response);
      });
    },
  };
}

const config: UserConfig = defineConfig({
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
    __WPT_CAPABILITY_PATHS__: JSON.stringify(capabilityPaths),
    __WPT_ROOT__: JSON.stringify(wptRoot ?? 'not prepared'),
  },
});

export default config;

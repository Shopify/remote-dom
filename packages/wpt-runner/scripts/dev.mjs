#!/usr/bin/env node

import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {prepareWpt} from './prepare-wpt.mjs';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

try {
  const wptRoot = await prepareWpt();
  const child = spawn(
    'pnpm',
    ['exec', 'vite', '--host', '127.0.0.1', '--open'],
    {
      cwd: packageRoot,
      env: {...process.env, WPT_ROOT: wptRoot},
      stdio: 'inherit',
    },
  );

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('exit', (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1);
  });
} catch (error) {
  console.error(
    error instanceof Error ? error.stack || error.message : String(error),
  );
  process.exitCode = 1;
}

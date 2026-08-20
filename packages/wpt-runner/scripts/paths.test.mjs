import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {
  isRunnerWorkerRequest,
  resolveServedWptFile,
  workerContentSecurityPolicy,
} from '../vite.config.ts';

let temporaryRoot;
let roots;

beforeAll(() => {
  temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'remote-dom-wpt-paths-'),
  );
  const fixtureRoot = path.join(temporaryRoot, 'fixtures');
  const wptRoot = path.join(temporaryRoot, 'wpt');
  fs.mkdirSync(path.join(wptRoot, 'resources'), {recursive: true});
  fs.mkdirSync(fixtureRoot);
  fs.writeFileSync(path.join(fixtureRoot, 'smoke.html'), 'smoke');
  fs.writeFileSync(
    path.join(wptRoot, 'resources', 'testharness.js'),
    'testharness',
  );
  roots = {fixtureRoot, wptRoot};
});

afterAll(() => {
  fs.rmSync(temporaryRoot, {force: true, recursive: true});
});

describe('WPT worker response policy', () => {
  it('recognizes only the Vite module-worker request', () => {
    expect(
      isRunnerWorkerRequest('/src/worker.ts?worker_file&type=module'),
    ).toBe(true);
    expect(isRunnerWorkerRequest('/src/worker.ts')).toBe(false);
    expect(
      isRunnerWorkerRequest('/src/worker.ts?worker_file&type=classic'),
    ).toBe(false);
    expect(isRunnerWorkerRequest('/src/main.ts?worker_file&type=module')).toBe(
      false,
    );
  });

  it('blocks worker connections and nested workers', () => {
    expect(workerContentSecurityPolicy).toContain("connect-src 'none'");
    expect(workerContentSecurityPolicy).toContain("worker-src 'none'");
    expect(workerContentSecurityPolicy).toContain("child-src 'none'");
  });
});

describe('WPT file serving paths', () => {
  it('resolves runner fixtures and upstream files inside their roots', () => {
    expect(resolveServedWptFile('__runner__/smoke.html', roots)).toBe(
      fs.realpathSync.native(path.join(roots.fixtureRoot, 'smoke.html')),
    );
    expect(resolveServedWptFile('resources/testharness.js', roots)).toBe(
      fs.realpathSync.native(
        path.join(roots.wptRoot, 'resources', 'testharness.js'),
      ),
    );
  });

  it('rejects missing files without returning an unchecked path', () => {
    expect(resolveServedWptFile('missing.html', roots)).toBeNull();
  });

  it('rejects symlinks that escape their served root', () => {
    const outside = path.join(temporaryRoot, 'secret.txt');
    fs.writeFileSync(outside, 'secret');
    fs.symlinkSync(outside, path.join(roots.wptRoot, 'escape.txt'));

    expect(resolveServedWptFile('escape.txt', roots)).toBeNull();
  });

  it('allows symlinks whose targets remain inside their served root', () => {
    fs.symlinkSync(
      path.join(roots.wptRoot, 'resources', 'testharness.js'),
      path.join(roots.wptRoot, 'internal-link.js'),
    );

    expect(resolveServedWptFile('internal-link.js', roots)).toBe(
      fs.realpathSync.native(
        path.join(roots.wptRoot, 'resources', 'testharness.js'),
      ),
    );
  });

  it.each([
    '../secret',
    'resources/../../secret',
    '/absolute',
    String.raw`resources\secret`,
    'resources//testharness.js',
  ])('rejects unsafe path %s', (unsafePath) => {
    expect(resolveServedWptFile(unsafePath, roots)).toBeNull();
  });
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {
  assertChecksum,
  prepareWpt,
  publishPreparedRevision,
  resolveCacheRoot,
  validateArchiveEntry,
} from './prepare-wpt.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, {force: true, recursive: true})),
  );
});

describe('WPT preparation', () => {
  it('resolves overrides, CI, XDG, and home caches in order', () => {
    expect(resolveCacheRoot({WPT_CACHE_DIR: './override', CI: 'true'})).toBe(
      path.resolve('./override'),
    );
    expect(resolveCacheRoot({CI: 'true', HOME: '/home/test'})).toMatch(
      /remote-dom[\\/]\.cache[\\/]wpt$/,
    );
    expect(
      resolveCacheRoot({XDG_CACHE_HOME: '/cache', HOME: '/home/test'}),
    ).toBe(path.resolve('/cache/remote-dom/wpt'));
    expect(resolveCacheRoot({HOME: '/home/test'})).toBe(
      path.resolve('/home/test/.cache/remote-dom/wpt'),
    );
  });

  it('uses a verified WPT_ROOT without downloading', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'remote-dom-wpt-root-'),
    );
    temporaryDirectories.push(root);
    await fs.mkdir(path.join(root, 'resources'));
    await fs.writeFile(
      path.join(root, 'resources/testharness.js'),
      '/* harness */',
    );
    const logs = [];

    await expect(
      prepareWpt({env: {WPT_ROOT: root}, log: (message) => logs.push(message)}),
    ).resolves.toBe(root);
    expect(logs.join('\n')).toContain('WPT root override');
  });

  it('publishes one revision when concurrent prepares race and ignores source markers', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'remote-dom-wpt-race-'),
    );
    temporaryDirectories.push(root);
    const lock = {revision: 'a'.repeat(40), sha256: 'b'.repeat(64)};
    const revisionRoot = path.join(root, lock.revision);
    const candidates = [
      path.join(root, 'candidate-1'),
      path.join(root, 'candidate-2'),
    ];

    for (const candidate of candidates) {
      await fs.mkdir(path.join(candidate, 'source/resources'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(candidate, 'source/resources/testharness.js'),
        '/* harness */',
      );
      await fs.writeFile(
        path.join(candidate, 'source/.remote-dom-wpt-complete.json'),
        JSON.stringify({revision: 'archive-provided'}),
      );
      await fs.writeFile(
        path.join(candidate, '.remote-dom-wpt-complete.json'),
        JSON.stringify(lock),
      );
    }

    await Promise.all(
      candidates.map((candidate) =>
        publishPreparedRevision(candidate, revisionRoot, lock, () => {}),
      ),
    );
    await expect(
      fs.readFile(
        path.join(revisionRoot, 'source/resources/testharness.js'),
        'utf8',
      ),
    ).resolves.toBe('/* harness */');
    await expect(
      fs.readFile(
        path.join(revisionRoot, '.remote-dom-wpt-complete.json'),
        'utf8',
      ),
    ).resolves.toContain(lock.revision);
  });

  it('rejects checksum mismatches', () => {
    expect(() => assertChecksum('actual', 'expected')).toThrow(
      'checksum mismatch',
    );
  });

  it('rejects traversal and unsafe links before extraction', () => {
    const revision = 'a'.repeat(40);
    const root = `wpt-${revision}`;
    expect(() =>
      validateArchiveEntry({path: `${root}/../escape`, type: 'File'}, revision),
    ).toThrow('Unsafe WPT archive entry');
    expect(() =>
      validateArchiveEntry(
        {
          path: `${root}/nested/link`,
          type: 'SymbolicLink',
          linkpath: '../../../escape',
        },
        revision,
      ),
    ).toThrow('Unsafe WPT archive symlink target');
    expect(() =>
      validateArchiveEntry(
        {
          path: `${root}/nested/link`,
          type: 'SymbolicLink',
          linkpath: '../inside',
        },
        revision,
      ),
    ).not.toThrow();
  });
});

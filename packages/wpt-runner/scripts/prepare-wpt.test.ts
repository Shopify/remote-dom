import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {create} from 'tar';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  assertChecksum,
  prepareWpt,
  publishPreparedRevision,
  resolveCacheRoot,
  validateArchiveEntry,
} from './prepare-wpt.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
interface ArchiveFixture {
  archive: Buffer;
  revision: string;
  root: string;
  sha256: string;
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, {force: true, recursive: true})),
  );
});

async function createArchiveFixture({
  unsafeSymlink = false,
}: {unsafeSymlink?: boolean} = {}): Promise<ArchiveFixture> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'remote-dom-wpt-archive-'),
  );
  temporaryDirectories.push(root);
  const revision = 'a'.repeat(40);
  const archiveRoot = path.join(root, `wpt-${revision}`);
  await fs.mkdir(path.join(archiveRoot, 'resources'), {recursive: true});
  await fs.writeFile(
    path.join(archiveRoot, 'resources/testharness.js'),
    '/* synthetic harness */',
  );
  if (unsafeSymlink) {
    await fs.mkdir(path.join(archiveRoot, 'nested'));
    await fs.symlink('../../../escape', path.join(archiveRoot, 'nested/link'));
  }

  const archivePath = path.join(root, 'wpt.tar.gz');
  await create({cwd: root, file: archivePath, gzip: true}, [`wpt-${revision}`]);
  const archive = await fs.readFile(archivePath);
  const sha256 = createHash('sha256').update(archive).digest('hex');
  return {archive, revision, root, sha256};
}

async function writeArchiveLock({
  revision,
  root,
  sha256,
}: Pick<ArchiveFixture, 'revision' | 'root' | 'sha256'>) {
  const lockPath = path.join(root, 'wpt.lock.json');
  await fs.writeFile(
    lockPath,
    JSON.stringify({
      repository: 'https://example.test/wpt',
      revision,
      archiveUrl: `https://example.test/wpt-${revision}.tar.gz`,
      sha256,
    }),
  );
  return lockPath;
}

describe('WPT preparation', () => {
  it('resolves overrides, CI, XDG, and home caches in order', () => {
    expect(resolveCacheRoot({WPT_CACHE_DIR: './override', CI: 'true'})).toBe(
      path.resolve('./override'),
    );
    expect(resolveCacheRoot({CI: 'true', HOME: '/home/test'})).toBe(
      path.join(repositoryRoot, '.cache/wpt'),
    );
    expect(
      resolveCacheRoot({XDG_CACHE_HOME: '/cache', HOME: '/home/test'}),
    ).toBe(path.resolve('/cache/remote-dom/wpt'));
    expect(resolveCacheRoot({HOME: '/home/test'})).toBe(
      path.resolve('/home/test/.cache/remote-dom/wpt'),
    );
  });

  it('downloads and extracts one archive for concurrent prepares', async () => {
    const fixture = await createArchiveFixture();
    const cacheRoot = path.join(fixture.root, 'cache');
    const lockPath = await writeArchiveLock(fixture);
    const fetchArchive = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new Response(fixture.archive);
    });
    vi.stubGlobal('fetch', fetchArchive);
    const logs: string[] = [];
    const options = {
      env: {WPT_CACHE_DIR: cacheRoot},
      lockPath,
      log: (message: string) => logs.push(message),
    };

    const [first, second] = await Promise.all([
      prepareWpt(options),
      prepareWpt(options),
    ]);

    expect(first).toBe(second);
    expect(fetchArchive).toHaveBeenCalledOnce();
    await expect(
      fs.readFile(path.join(first, 'resources/testharness.js'), 'utf8'),
    ).resolves.toBe('/* synthetic harness */');
    await expect(fs.readdir(cacheRoot)).resolves.toEqual([fixture.revision]);
    expect(logs.join('\n')).toContain('waiting for another process');
  });

  it('recovers a lock owned by a process that is no longer running', async () => {
    const fixture = await createArchiveFixture();
    const cacheRoot = path.join(fixture.root, 'cache');
    const lockPath = await writeArchiveLock(fixture);
    const preparationLock = path.join(cacheRoot, `.lock-${fixture.revision}`);
    await fs.mkdir(preparationLock, {recursive: true});
    await fs.writeFile(
      path.join(preparationLock, 'owner.json'),
      JSON.stringify({pid: 999_999_999, token: 'abandoned'}),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(fixture.archive)),
    );
    const logs: string[] = [];

    await expect(
      prepareWpt({
        env: {WPT_CACHE_DIR: cacheRoot},
        lockPath,
        log: (message: string) => logs.push(message),
      }),
    ).resolves.toContain(path.join(fixture.revision, 'source'));
    expect(logs.join('\n')).toContain('removing stale preparation lock');
  });

  it('rejects a checksum-valid unsafe archive before extraction', async () => {
    const fixture = await createArchiveFixture({unsafeSymlink: true});
    const cacheRoot = path.join(fixture.root, 'cache');
    const lockPath = await writeArchiveLock(fixture);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(fixture.archive)),
    );

    await expect(
      prepareWpt({env: {WPT_CACHE_DIR: cacheRoot}, lockPath, log: () => {}}),
    ).rejects.toThrow('Unsafe WPT archive symlink target');
    await expect(fs.readdir(cacheRoot)).resolves.toEqual([]);
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
    const logs: string[] = [];

    await expect(
      prepareWpt({
        env: {WPT_ROOT: root},
        log: (message: string) => logs.push(message),
      }),
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

#!/usr/bin/env node

import {createHash, randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {extract, list, type ReadEntry} from 'tar';

type Environment = Readonly<Record<string, string | undefined>>;
type Log = (message: string) => void;

interface WptLock {
  repository: string;
  revision: string;
  archiveUrl: string;
  sha256: string;
}

type RevisionIdentity = Pick<WptLock, 'revision' | 'sha256'>;
type ArchiveEntry = Pick<ReadEntry, 'path' | 'type' | 'linkpath'>;

interface PrepareWptOptions {
  env?: Environment;
  lockPath?: string;
  log?: Log;
}

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const repositoryRoot = path.resolve(packageRoot, '../..');
const defaultLockPath = path.join(packageRoot, 'wpt.lock.json');
const completionMarker = '.remote-dom-wpt-complete.json';
const lockOwnerFile = 'owner.json';
const lockPollIntervalMs = 100;
const lockStaleMs = 5 * 60 * 1_000;
const lockWaitTimeoutMs = 10 * 60 * 1_000;
const requiredFiles = ['resources/testharness.js'];

export async function prepareWpt({
  env = process.env,
  lockPath = defaultLockPath,
  log = console.log,
}: PrepareWptOptions = {}): Promise<string> {
  if (env.WPT_ROOT) {
    const override = path.resolve(env.WPT_ROOT);
    await verifySentinels(override);
    log(`[wpt] WPT root override: ${override}`);
    return override;
  }

  const lock = await readLock(lockPath);
  const cacheRoot = resolveCacheRoot(env);
  const revisionRoot = path.join(cacheRoot, lock.revision);
  const sourceRoot = path.join(revisionRoot, 'source');
  log(`[wpt] cache root: ${cacheRoot}`);

  if (await isCompletedRevision(revisionRoot, lock)) {
    log(`[wpt] using cached WPT ${lock.revision}`);
    return sourceRoot;
  }

  await fs.mkdir(cacheRoot, {recursive: true});
  const revisionLockPath = path.join(cacheRoot, `.lock-${lock.revision}`);
  const releaseLock = await acquireRevisionLock(
    revisionLockPath,
    revisionRoot,
    lock,
    log,
  );
  if (!releaseLock) {
    log(`[wpt] another process installed WPT ${lock.revision}; reusing it`);
    return sourceRoot;
  }

  try {
    if (await isCompletedRevision(revisionRoot, lock)) {
      log(`[wpt] another process installed WPT ${lock.revision}; reusing it`);
      return sourceRoot;
    }

    const existingRevision = await fs.stat(revisionRoot).catch(() => null);
    if (existingRevision) {
      throw new Error(
        `Invalid WPT cache entry at ${revisionRoot}. Remove it and retry.`,
      );
    }

    await installWptRevision(cacheRoot, revisionRoot, lock, log);
    return sourceRoot;
  } finally {
    await releaseLock();
  }
}

async function installWptRevision(
  cacheRoot: string,
  revisionRoot: string,
  lock: WptLock,
  log: Log,
): Promise<void> {
  const nonce = `${process.pid}-${randomBytes(8).toString('hex')}`;
  const archivePath = path.join(
    cacheRoot,
    `.archive-${lock.revision}-${nonce}.tar.gz`,
  );
  const temporaryRevision = path.join(
    cacheRoot,
    `.revision-${lock.revision}-${nonce}`,
  );
  const temporarySource = path.join(temporaryRevision, 'source');

  try {
    log(`[wpt] downloading ${lock.archiveUrl}`);
    const actualChecksum = await downloadArchive(lock.archiveUrl, archivePath);
    assertChecksum(actualChecksum, lock.sha256);
    await validateArchive(archivePath, lock.revision);

    await fs.mkdir(temporarySource, {recursive: true});
    await extract({
      cwd: temporarySource,
      file: archivePath,
      preservePaths: false,
      strip: 1,
    });
    await verifySentinels(temporarySource);
    await fs.writeFile(
      path.join(temporaryRevision, completionMarker),
      `${JSON.stringify({revision: lock.revision, sha256: lock.sha256}, null, 2)}\n`,
      {flag: 'wx'},
    );

    await publishPreparedRevision(temporaryRevision, revisionRoot, lock, log);
  } finally {
    await Promise.allSettled([
      fs.rm(archivePath, {force: true}),
      fs.rm(temporaryRevision, {force: true, recursive: true}),
    ]);
  }
}

async function acquireRevisionLock(
  lockPath: string,
  revisionRoot: string,
  lock: RevisionIdentity,
  log: Log,
): Promise<(() => Promise<void>) | null> {
  const startedAt = Date.now();
  const token = randomBytes(16).toString('hex');
  let announcedWait = false;

  while (true) {
    if (await isCompletedRevision(revisionRoot, lock)) return null;

    try {
      await fs.mkdir(lockPath);
      try {
        await fs.writeFile(
          path.join(lockPath, lockOwnerFile),
          `${JSON.stringify({pid: process.pid, token})}\n`,
          {flag: 'wx'},
        );
      } catch (error) {
        await fs.rm(lockPath, {force: true, recursive: true});
        throw error;
      }

      return async () => {
        const owner = await readLockOwner(lockPath);
        if (owner?.token === token) {
          await fs.rm(lockPath, {force: true, recursive: true});
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }

    if (await isStaleLock(lockPath)) {
      log(`[wpt] removing stale preparation lock ${lockPath}`);
      await fs.rm(lockPath, {force: true, recursive: true});
      continue;
    }

    if (Date.now() - startedAt >= lockWaitTimeoutMs) {
      throw new Error(
        `Timed out waiting for WPT preparation lock ${lockPath}. Remove it if no preparation is running.`,
      );
    }
    if (!announcedWait) {
      log(`[wpt] waiting for another process to prepare WPT ${lock.revision}`);
      announcedWait = true;
    }
    await delay(lockPollIntervalMs);
  }
}

async function isStaleLock(lockPath: string): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  if (owner) return !isProcessAlive(owner.pid);

  const stat = await fs.stat(lockPath).catch(() => null);
  return Boolean(stat && Date.now() - stat.mtimeMs >= lockStaleMs);
}

async function readLockOwner(
  lockPath: string,
): Promise<{pid: number; token: string} | null> {
  try {
    const owner = JSON.parse(
      await fs.readFile(path.join(lockPath, lockOwnerFile), 'utf8'),
    );
    return Number.isInteger(owner.pid) &&
      owner.pid > 0 &&
      typeof owner.token === 'string'
      ? owner
      : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function publishPreparedRevision(
  temporaryRevision: string,
  revisionRoot: string,
  lock: RevisionIdentity,
  log: Log = console.log,
): Promise<void> {
  try {
    await fs.rename(temporaryRevision, revisionRoot);
    log(`[wpt] installed WPT ${lock.revision}`);
  } catch (error) {
    if (!isDestinationExistsError(error)) throw error;
    if (!(await isCompletedRevision(revisionRoot, lock))) {
      throw new Error(
        `Another process created an invalid WPT cache entry at ${revisionRoot}. Remove it and retry.`,
        {cause: error},
      );
    }
    log(`[wpt] another process installed WPT ${lock.revision}; reusing it`);
  }
}

export function resolveCacheRoot(env: Environment = process.env): string {
  if (env.WPT_CACHE_DIR) return path.resolve(env.WPT_CACHE_DIR);
  if (env.CI) return path.join(repositoryRoot, '.cache/wpt');
  if (env.XDG_CACHE_HOME)
    return path.resolve(env.XDG_CACHE_HOME, 'remote-dom/wpt');

  const home = env.HOME || os.homedir();
  if (!home) {
    throw new Error(
      'Cannot resolve the WPT cache: HOME is unset. Set WPT_CACHE_DIR.',
    );
  }
  return path.resolve(home, '.cache/remote-dom/wpt');
}

export function assertChecksum(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(
      `WPT archive checksum mismatch: expected ${expected}, got ${actual}.`,
    );
  }
}

async function readLock(lockPath: string): Promise<WptLock> {
  const lockData = JSON.parse(await fs.readFile(lockPath, 'utf8')) as Record<
    string,
    unknown
  >;
  for (const key of ['repository', 'revision', 'archiveUrl', 'sha256']) {
    if (typeof lockData[key] !== 'string' || !lockData[key]) {
      throw new Error(`Invalid WPT lock ${lockPath}: ${key} is required.`);
    }
  }
  const lock = lockData as unknown as WptLock;
  if (!/^[0-9a-f]{40}$/.test(lock.revision)) {
    throw new Error(
      `Invalid WPT lock ${lockPath}: revision must be a full commit SHA.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(lock.sha256)) {
    throw new Error(
      `Invalid WPT lock ${lockPath}: sha256 must be a lowercase SHA-256 digest.`,
    );
  }
  const archiveUrl = new URL(lock.archiveUrl);
  if (archiveUrl.protocol !== 'https:') {
    throw new Error(`Invalid WPT lock ${lockPath}: archiveUrl must use HTTPS.`);
  }
  return lock;
}

async function downloadArchive(
  url: string,
  destination: string,
): Promise<string> {
  const response = await fetch(url, {redirect: 'follow'});
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download WPT archive: ${response.status} ${response.statusText}`,
    );
  }

  const hash = createHash('sha256');
  const hasher = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream),
    hasher,
    createWriteStream(destination, {flags: 'wx'}),
  );
  return hash.digest('hex');
}

async function validateArchive(
  archivePath: string,
  revision: string,
): Promise<void> {
  let validationError: unknown;
  await list({
    file: archivePath,
    onentry(entry) {
      try {
        validateArchiveEntry(entry, revision);
      } catch (error) {
        validationError ??= error;
      }
      entry.resume();
    },
  });
  if (validationError) throw validationError;
}

export function validateArchiveEntry(
  entry: ArchiveEntry,
  revision: string,
): void {
  const expectedRoot = `wpt-${revision}`;
  const entryPath = validateArchivePath(
    entry.path,
    expectedRoot,
    'archive entry',
  );
  const allowedTypes = new Set([
    'File',
    'OldFile',
    'Directory',
    'SymbolicLink',
    'ExtendedHeader',
    'GlobalExtendedHeader',
  ]);

  if (!allowedTypes.has(entry.type)) {
    throw new Error(
      `Unsafe WPT archive entry type ${JSON.stringify(entry.type)} for ${JSON.stringify(entry.path)}.`,
    );
  }

  if (entry.type === 'SymbolicLink') {
    const linkPath = entry.linkpath;
    if (
      !linkPath ||
      path.posix.isAbsolute(linkPath) ||
      linkPath.includes('\\')
    ) {
      throw new Error(
        `Unsafe WPT archive symlink target for ${JSON.stringify(entry.path)}.`,
      );
    }
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(entryPath), linkPath),
    );
    validateArchivePath(target, expectedRoot, 'archive symlink target');
  }
}

function validateArchivePath(
  value: string,
  expectedRoot: string,
  label: string,
): string {
  if (!value || value.includes('\\') || path.posix.isAbsolute(value)) {
    throw new Error(`Unsafe WPT ${label}: ${JSON.stringify(value)}.`);
  }
  const withoutTrailingSlash = value.replace(/\/$/, '');
  if (withoutTrailingSlash.split('/').includes('..')) {
    throw new Error(`Unsafe WPT ${label}: ${JSON.stringify(value)}.`);
  }
  const normalized = path.posix.normalize(withoutTrailingSlash);
  if (
    normalized !== expectedRoot &&
    !normalized.startsWith(`${expectedRoot}/`)
  ) {
    throw new Error(`Unsafe WPT ${label}: ${JSON.stringify(value)}.`);
  }
  return normalized;
}

async function verifySentinels(sourceRoot: string): Promise<void> {
  for (const relativePath of requiredFiles) {
    const sentinel = path.join(sourceRoot, relativePath);
    const stat = await fs.stat(sentinel).catch(() => null);
    if (!stat?.isFile()) {
      throw new Error(
        `Invalid WPT root ${sourceRoot}: missing ${relativePath}.`,
      );
    }
  }
}

async function isCompletedRevision(
  revisionRoot: string,
  lock: RevisionIdentity,
): Promise<boolean> {
  try {
    await verifySentinels(path.join(revisionRoot, 'source'));
    const marker = JSON.parse(
      await fs.readFile(path.join(revisionRoot, completionMarker), 'utf8'),
    );
    return marker.revision === lock.revision && marker.sha256 === lock.sha256;
  } catch {
    return false;
  }
}

function isDestinationExistsError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EEXIST' || code === 'ENOTEMPTY';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const root = await prepareWpt();
    console.log(root);
  } catch (error) {
    console.error(
      error instanceof Error ? error.stack || error.message : String(error),
    );
    process.exitCode = 1;
  }
}

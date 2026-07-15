#!/usr/bin/env node

import {createHash, randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {extract, list} from 'tar';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const repositoryRoot = path.resolve(packageRoot, '../..');
const defaultLockPath = path.join(packageRoot, 'wpt.lock.json');
const completionMarker = '.remote-dom-wpt-complete.json';
const requiredFiles = ['resources/testharness.js'];

export async function prepareWpt({
  env = process.env,
  lockPath = defaultLockPath,
  log = console.log,
} = {}) {
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

  if (await isCompletedSource(sourceRoot, lock)) {
    log(`[wpt] using cached WPT ${lock.revision}`);
    return sourceRoot;
  }

  await fs.mkdir(revisionRoot, {recursive: true});
  const nonce = `${process.pid}-${randomBytes(8).toString('hex')}`;
  const archivePath = path.join(revisionRoot, `.archive-${nonce}.tar.gz`);
  const temporarySource = path.join(revisionRoot, `.source-${nonce}`);

  try {
    log(`[wpt] downloading ${lock.archiveUrl}`);
    const actualChecksum = await downloadArchive(lock.archiveUrl, archivePath);
    assertChecksum(actualChecksum, lock.sha256);
    await validateArchive(archivePath, lock.revision);

    await fs.mkdir(temporarySource);
    await extract({
      cwd: temporarySource,
      file: archivePath,
      preservePaths: false,
      strip: 1,
    });
    await verifySentinels(temporarySource);
    await fs.writeFile(
      path.join(temporarySource, completionMarker),
      `${JSON.stringify({revision: lock.revision, sha256: lock.sha256}, null, 2)}\n`,
      {flag: 'wx'},
    );

    await publishPreparedSource(temporarySource, sourceRoot, lock, log);
    return sourceRoot;
  } finally {
    await Promise.allSettled([
      fs.rm(archivePath, {force: true}),
      fs.rm(temporarySource, {force: true, recursive: true}),
    ]);
  }
}

export async function publishPreparedSource(
  temporarySource,
  sourceRoot,
  lock,
  log = console.log,
) {
  try {
    await fs.rename(temporarySource, sourceRoot);
    log(`[wpt] installed WPT ${lock.revision}`);
  } catch (error) {
    if (!isDestinationExistsError(error)) throw error;
    if (!(await isCompletedSource(sourceRoot, lock))) {
      throw new Error(
        `Another process created an invalid WPT cache entry at ${sourceRoot}. Remove it and retry.`,
        {cause: error},
      );
    }
    log(`[wpt] another process installed WPT ${lock.revision}; reusing it`);
  }
}

export function resolveCacheRoot(env = process.env) {
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

export function assertChecksum(actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `WPT archive checksum mismatch: expected ${expected}, got ${actual}.`,
    );
  }
}

export function validateArchiveEntry(entry, revision) {
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

async function readLock(lockPath) {
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  for (const key of ['repository', 'revision', 'archiveUrl', 'sha256']) {
    if (typeof lock[key] !== 'string' || !lock[key]) {
      throw new Error(`Invalid WPT lock ${lockPath}: ${key} is required.`);
    }
  }
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

async function downloadArchive(url, destination) {
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
    Readable.fromWeb(response.body),
    hasher,
    createWriteStream(destination, {flags: 'wx'}),
  );
  return hash.digest('hex');
}

async function validateArchive(archivePath, revision) {
  let validationError;
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

function validateArchivePath(value, expectedRoot, label) {
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

async function verifySentinels(sourceRoot) {
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

async function isCompletedSource(sourceRoot, lock) {
  try {
    await verifySentinels(sourceRoot);
    const marker = JSON.parse(
      await fs.readFile(path.join(sourceRoot, completionMarker), 'utf8'),
    );
    return marker.revision === lock.revision && marker.sha256 === lock.sha256;
  } catch {
    return false;
  }
}

function isDestinationExistsError(error) {
  return error?.code === 'EEXIST' || error?.code === 'ENOTEMPTY';
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

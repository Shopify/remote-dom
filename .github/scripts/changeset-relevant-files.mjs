#!/usr/bin/env node

import {execFileSync} from 'node:child_process';

const [baseRef, headRef = 'HEAD'] = process.argv.slice(2);

if (!baseRef) {
  console.error('Usage: changeset-relevant-files.mjs <base-ref> [<head-ref>]');
  process.exit(2);
}

const mergeBase = git(['merge-base', baseRef, headRef]).trim();
const changedFiles = gitBuffer([
  'diff',
  '--name-only',
  '--no-renames',
  '-z',
  mergeBase,
  headRef,
])
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

const packageVisibility = new Map();
const relevantFiles = changedFiles.filter((file) => {
  const match = /^packages\/([^/]+)\/(?:package\.json|source\/(.+))$/.exec(
    file,
  );

  if (!match) return false;

  const [, packageDirectory, sourcePath] = match;

  if (sourcePath && (isTest(sourcePath) || isMarkdown(sourcePath))) {
    return false;
  }

  if (!packageVisibility.has(packageDirectory)) {
    const packageJsonPath = `packages/${packageDirectory}/package.json`;
    const manifests = [
      readPackageJson(headRef, packageJsonPath),
      readPackageJson(mergeBase, packageJsonPath),
    ].filter(Boolean);

    packageVisibility.set(
      packageDirectory,
      manifests.some((manifest) => manifest.private !== true),
    );
  }

  return packageVisibility.get(packageDirectory) === true;
});

process.stdout.write(relevantFiles.join('\n'));

function git(args) {
  return gitBuffer(args).toString('utf8');
}

function gitBuffer(args) {
  return execFileSync('git', args, {stdio: ['ignore', 'pipe', 'inherit']});
}

function readPackageJson(ref, file) {
  try {
    return JSON.parse(
      execFileSync('git', ['show', `${ref}:${file}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    );
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    return undefined;
  }
}

function isTest(file) {
  const pathSegments = file.split('/');

  return (
    pathSegments.includes('tests') ||
    pathSegments.includes('__tests__') ||
    /\.(?:test|spec)\.[^/]+$/i.test(file)
  );
}

function isMarkdown(file) {
  return /\.mdx?$/i.test(file);
}

#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {chromium, type Browser, type Page} from '@playwright/test';
import {createServer, type ViteDevServer} from 'vite';
import type {WptHarnessTestResult, WptRunRecord} from '../src/types.ts';
import {
  compareCodeUnits,
  readCapabilities,
  rowsByPath,
  type CapabilityRow,
} from './capabilities.ts';
import {evaluateCapabilities} from './evaluate-capabilities.ts';
import {prepareWpt} from './prepare-wpt.ts';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const capabilitiesPath = path.join(packageRoot, 'capabilities.tsv');

interface RunnerOptions {
  enforceCapabilities: boolean;
  headed: boolean;
  help: boolean;
  host: string;
  port: number | undefined;
  strictPort: boolean;
  testPaths: string[];
  timeoutMs: number;
  verbose: boolean;
}

const options = parseArguments(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;

try {
  const capabilities = await readCapabilities(capabilitiesPath);
  const groupedCapabilities = rowsByPath(capabilities);
  const selectedPaths = selectPaths(options, groupedCapabilities);
  if (selectedPaths.length === 0) throw new Error('No WPT files selected.');

  const wptRoot = await prepareWpt();
  process.env.WPT_ROOT = wptRoot;

  server = await createServer({
    root: packageRoot,
    configFile: path.join(packageRoot, 'vite.config.ts'),
    logLevel: options.verbose ? 'info' : 'warn',
    server: {
      host: options.host,
      port: options.port,
      strictPort: options.strictPort,
      open: false,
    },
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local[0];
  if (!baseUrl) throw new Error('Vite did not report a local server URL.');
  console.log(`[wpt] serving ${baseUrl}`);

  browser = await chromium.launch({headless: !options.headed});
  page = await browser.newPage();
  if (options.verbose) {
    page.on('console', (message) =>
      console.log(`[browser:${message.type()}] ${message.text()}`),
    );
  }
  page.on('pageerror', (error) =>
    console.error(`[browser:error] ${formatError(error)}`),
  );
  const runnerUrl = new URL(baseUrl);
  runnerUrl.searchParams.set('timeout', String(options.timeoutMs));
  await page.goto(runnerUrl.href, {waitUntil: 'domcontentloaded'});

  let failures = 0;
  for (const testPath of selectedPaths) {
    const run = await runWpt(page, testPath);
    const rows = options.enforceCapabilities
      ? groupedCapabilities.get(testPath)
      : undefined;
    const failed = rows
      ? printCapabilityResult(run, rows)
      : printExploratoryResult(run);
    if (failed) failures += 1;
  }

  console.log(
    `\n[wpt] ${selectedPaths.length - failures}/${selectedPaths.length} file(s) passed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
} catch (error) {
  console.error(`[wpt] ${formatError(error)}`);
  process.exitCode = 1;
} finally {
  await page?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
}

function parseArguments(arguments_: string[]): RunnerOptions {
  const normalizedArguments =
    arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const {values, positionals} = parseArgs({
    args: normalizedArguments,
    allowPositionals: true,
    options: {
      capabilities: {type: 'boolean'},
      headed: {type: 'boolean'},
      help: {type: 'boolean', short: 'h'},
      host: {type: 'string'},
      port: {type: 'string'},
      'strict-port': {type: 'boolean'},
      timeout: {type: 'string'},
      verbose: {type: 'boolean'},
    },
    strict: true,
  });

  return {
    enforceCapabilities:
      Boolean(values.capabilities) || positionals.length === 0,
    headed: Boolean(values.headed),
    help: Boolean(values.help),
    host: values.host ?? '127.0.0.1',
    port: values.port === undefined ? undefined : parsePort(values.port),
    strictPort: Boolean(values['strict-port']),
    testPaths: positionals,
    timeoutMs:
      values.timeout === undefined ? 30_000 : parseDuration(values.timeout),
    verbose: Boolean(values.verbose),
  };
}

function selectPaths(
  options: RunnerOptions,
  groupedCapabilities: ReadonlyMap<string, readonly CapabilityRow[]>,
): string[] {
  if (options.testPaths.length === 0) return [...groupedCapabilities.keys()];

  const paths = [...new Set(options.testPaths)].sort(compareCodeUnits);
  if (options.enforceCapabilities) {
    const missing = paths.filter(
      (testPath) => !groupedCapabilities.has(testPath),
    );
    if (missing.length > 0) {
      throw new Error(
        `WPT path(s) are not in capabilities.tsv: ${missing.map((testPath) => JSON.stringify(testPath)).join(', ')}`,
      );
    }
  }
  return paths;
}

async function runWpt(
  browserPage: Page,
  testPath: string,
): Promise<WptRunRecord> {
  console.log(`\n[wpt] RUN ${testPath}`);
  try {
    return await browserPage.evaluate(
      (path) => window.__WPT_RUN_TEST__(path),
      testPath,
    );
  } catch (error) {
    return {
      state: 'error',
      path: testPath,
      warnings: [],
      logs: [],
      error: `Runner page evaluation failed: ${formatError(error)}`,
    };
  }
}

function printExploratoryResult(run: WptRunRecord): boolean {
  const tests = run.result?.tests ?? [];
  const failedTests = tests.filter((test) => test.status !== 0);
  const failed =
    run.state === 'error' ||
    run.result?.status.status !== 0 ||
    failedTests.length > 0;
  console.log(
    `[wpt] ${failed ? 'FAIL' : 'PASS'} ${run.path} (${tests.length} test(s))`,
  );
  printWarnings(run);
  printHarnessFailure(run);
  for (const test of failedTests) printTestFailure(test, '  - ');
  printRunError(run);
  return failed;
}

function printCapabilityResult(
  run: WptRunRecord,
  rows: readonly CapabilityRow[],
): boolean {
  const tests = run.result?.tests ?? [];
  const summary = evaluateCapabilities(run, rows);

  console.log(
    `[wpt] ${summary.failed ? 'FAIL' : 'PASS'} ${run.path} (${tests.length} test(s), classified)`,
  );
  console.log(
    `  supported: ${summary.supportedPassed.length} passed, ${summary.supportedFailures.length} failed`,
  );
  console.log(
    `  deferred: ${summary.promotionCandidates.length} passed, ${summary.deferredFailures.length} failed`,
  );
  console.log(
    `  unlisted: ${summary.unlisted.length}; missing: ${summary.missing.length}`,
  );
  printWarnings(run);
  printHarnessFailure(run);

  for (const {test} of summary.supportedFailures)
    printTestFailure(test, '  - ');
  for (const name of summary.duplicateResults)
    console.log(`  duplicate result: ${name}`);
  for (const test of summary.unlisted) console.log(`  unlisted: ${test.name}`);
  for (const row of summary.missing) console.log(`  missing: ${row.case}`);
  for (const {row} of summary.deferredFailures) {
    console.log(`  deferred failure: ${row.case} — ${row.note}`);
  }
  for (const {row} of summary.promotionCandidates) {
    console.log(`  promotion candidate: ${row.case} — ${row.note}`);
  }
  printRunError(run);
  return summary.failed;
}

function printWarnings(run: WptRunRecord): void {
  for (const warning of run.warnings ?? [])
    console.log(`  warning: ${warning}`);
}

function printHarnessFailure(run: WptRunRecord): void {
  if (run.result && run.result.status.status !== 0) {
    console.log(
      `  harness status ${run.result.status.status}: ${run.result.status.message || '<no message>'}`,
    );
  }
}

function printTestFailure(test: WptHarnessTestResult, prefix: string): void {
  console.log(`${prefix}${test.name}: status ${test.status}`);
  if (test.message) console.log(indent(test.message, '    '));
  if (test.stack) console.log(indent(test.stack, '    '));
}

function printRunError(run: WptRunRecord): void {
  if (run.error) console.log(indent(run.error, '  '));
  if (run.state === 'error' && run.logs?.length > 0) {
    console.log('  recent logs:');
    for (const line of run.logs.slice(-20)) console.log(indent(line, '    '));
  }
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid --port value: ${value}`);
  }
  return port;
}

function parseDuration(value: string): number {
  const match = /^(\d+)(ms|s)?$/.exec(value);
  if (!match) throw new Error(`Invalid --timeout value: ${value}`);

  const duration = Number(match[1]!) * (match[2] === 's' ? 1000 : 1);
  if (!Number.isSafeInteger(duration) || duration <= 0) {
    throw new Error(
      `Invalid --timeout value: ${value}. Expected a positive duration.`,
    );
  }
  return duration;
}

function indent(text: string, prefix: string): string {
  return String(text)
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.stack || error.message : String(error);
}

function printHelp(): void {
  console.log(`Run selected WPT testharness HTML files against @remote-dom/polyfill.

Usage:
  pnpm test:wpt
  pnpm test:wpt -- [options] [wpt-path ...]

Options:
  --capabilities       Enforce capabilities.tsv for explicit paths.
  --headed             Show Playwright Chromium.
  --verbose            Print browser console and Vite logs.
  --timeout <duration> Per-file timeout (30000, 30000ms, or 30s).
  --host <host>        Vite host (default: 127.0.0.1).
  --port <port>        Vite port.
  --strict-port        Fail when the requested port is unavailable.
  -h, --help           Show this help.

With no paths, the runner executes every unique capabilities.tsv path in canonical
order and enforces every row. Explicit paths are exploratory unless --capabilities
is present. Set WPT_ROOT to reuse an existing checkout or WPT_CACHE_DIR to override
the revision-addressed download cache.`);
}

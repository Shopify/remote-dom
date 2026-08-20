import {buildWptBundle} from './adapter.ts';
import {executeWorker} from './run-worker.ts';
import type {WptHarnessResult, WptRunRecord} from './types.ts';
import './style.css';

declare const __WPT_ROOT__: string;

declare global {
  interface Window {
    __WPT_RUN_TEST__: (path: string) => Promise<WptRunRecord>;
  }
}

const elements = {
  run: requireElement<HTMLButtonElement>('run'),
  path: requireElement<HTMLInputElement>('path'),
  status: requireElement<HTMLPreElement>('status'),
  result: requireElement<HTMLPreElement>('result'),
  log: requireElement<HTMLPreElement>('log'),
  original: requireElement<HTMLPreElement>('original'),
  generated: requireElement<HTMLPreElement>('generated'),
  harness: requireElement<HTMLPreElement>('harness'),
};

interface RunSession {
  controller: AbortController;
  record: WptRunRecord;
}

let activeRun: RunSession | undefined;
window.__WPT_RUN_TEST__ = runWptTest;
elements.status.textContent = `WPT root: ${__WPT_ROOT__}`;

const parameters = new URLSearchParams(location.search);
const initialPath = parameters.get('path');
const timeoutMs = parseTimeout(parameters.get('timeout'));
if (initialPath) elements.path.value = initialPath;

parameters.get('autorun') === '1' &&
  queueMicrotask(() => void runCurrentPath());
elements.run.addEventListener('click', () => void runCurrentPath());
elements.path.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') void runCurrentPath();
});

async function runCurrentPath() {
  const testPath = elements.path.value.trim();
  if (!testPath) return;
  elements.run.disabled = true;
  try {
    return await runWptTest(testPath);
  } finally {
    if (!activeRun) elements.run.disabled = false;
  }
}

async function runWptTest(testPath: string): Promise<WptRunRecord> {
  const session = startRun(testPath);

  try {
    const bundle = await buildWptBundle(testPath);
    session.controller.signal.throwIfAborted();
    if (!isActive(session)) return session.record;

    session.record.warnings = bundle.warnings;
    elements.original.textContent = bundle.sourceHtml;
    elements.harness.textContent = bundle.harnessSource;
    elements.generated.textContent = bundle.testSource;
    for (const warning of bundle.warnings)
      appendLog(session.record, `warning: ${warning}`);

    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    const result = await executeWorker(worker, {
      request: {
        type: 'run',
        path: testPath,
        source: bundle.generatedSource,
      },
      signal: session.controller.signal,
      timeoutMs,
      onReady() {
        if (!isActive(session)) return;
        session.record.state = 'waiting';
        elements.status.textContent =
          'Worker ready; waiting for testharness completion…';
      },
      onLog(message) {
        if (!isActive(session)) return;
        appendLog(session.record, `[${message.level}] ${message.text}`);
      },
    });

    if (isActive(session)) finishWithResult(session.record, result);
  } catch (error) {
    if (isActive(session)) finishWithError(session.record, error);
  } finally {
    if (isActive(session)) activeRun = undefined;
  }

  return session.record;
}

function finishWithResult(record: WptRunRecord, result: WptHarnessResult) {
  record.result = result;
  record.state = hasFailures(result) ? 'failed' : 'passed';
  elements.status.textContent =
    record.state === 'passed' ? 'PASS' : 'Completed with failures.';
  elements.result.textContent = JSON.stringify(result, null, 2);
}

function finishWithError(record: WptRunRecord, error: unknown) {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  record.state = 'error';
  record.error = message;
  elements.status.textContent = 'Runner error.';
  elements.result.textContent = message;
  appendLog(record, message);
}

function startRun(testPath: string): RunSession {
  activeRun?.controller.abort(
    new DOMException('Superseded by a new WPT run.', 'AbortError'),
  );

  const session = {
    controller: new AbortController(),
    record: createRun('running', testPath),
  };
  activeRun = session;
  elements.status.textContent = 'Preparing WPT source…';
  elements.result.textContent = 'Waiting for testharness completion…';
  elements.log.textContent = '';
  elements.original.textContent = 'Loading…';
  elements.harness.textContent = 'Loading…';
  elements.generated.textContent = 'Loading…';
  return session;
}

function isActive(session: RunSession) {
  return activeRun === session;
}

function createRun(state: WptRunRecord['state'], path: string): WptRunRecord {
  return {state, path, warnings: [], logs: []};
}

function appendLog(record: WptRunRecord, message: string) {
  record.logs.push(message);
  elements.log.append(`${message}\n`);
}

function hasFailures(result: WptHarnessResult) {
  return (
    result.status.status !== 0 || result.tests.some((test) => test.status !== 0)
  );
}

function parseTimeout(value: string | null) {
  if (!value) return 30_000;
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 30_000;
}

function requireElement<ElementType extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}.`);
  return element as ElementType;
}

import {buildWptBundle} from './adapter.ts';
import type {WorkerResponse, WptHarnessResult, WptRunRecord} from './types.ts';
import './style.css';

declare const __WPT_ROOT__: string;

declare global {
  interface Window {
    __WPT_LAST_RUN__: WptRunRecord;
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

let activeWorker: Worker | undefined;
let activeTimeout: ReturnType<typeof setTimeout> | undefined;
let currentRun: WptRunRecord = createRun('idle', '');
window.__WPT_LAST_RUN__ = currentRun;
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
  if (!testPath) return currentRun;
  elements.run.disabled = true;
  try {
    return await runWptTest(testPath);
  } finally {
    elements.run.disabled = false;
  }
}

async function runWptTest(testPath: string): Promise<WptRunRecord> {
  reset(testPath);

  try {
    const bundle = await buildWptBundle(testPath);
    currentRun.warnings = bundle.warnings;
    sync();
    elements.original.textContent = bundle.sourceHtml;
    elements.harness.textContent = bundle.harnessSource;
    elements.generated.textContent = bundle.testSource;
    for (const warning of bundle.warnings) appendLog(`warning: ${warning}`);

    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    activeWorker = worker;
    worker.onerror = (event) => finishWithError(event.error ?? event.message);
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (worker !== activeWorker) return;
      const message = event.data;
      if (message.type === 'ready') {
        currentRun.state = 'waiting';
        elements.status.textContent =
          'Worker ready; waiting for testharness completion…';
        sync();
      } else if (message.type === 'log') {
        appendLog(`[${message.level}] ${message.text}`);
      } else if (message.type === 'complete') {
        finishWithResult(message.result);
      } else if (message.type === 'error') {
        finishWithError(message.error);
      }
    };
    worker.postMessage({
      type: 'run',
      path: testPath,
      source: bundle.generatedSource,
    });
    activeTimeout = setTimeout(() => {
      worker.terminate();
      finishWithError(
        `Timed out after ${timeoutMs}ms waiting for testharness completion.`,
      );
    }, timeoutMs);
  } catch (error) {
    finishWithError(error);
  }

  return currentRun;
}

function finishWithResult(result: WptHarnessResult) {
  clearActiveTimeout();
  currentRun.result = result;
  currentRun.state = hasFailures(result) ? 'failed' : 'passed';
  elements.status.textContent =
    currentRun.state === 'passed' ? 'PASS' : 'Completed with failures.';
  elements.result.textContent = JSON.stringify(result, null, 2);
  sync();
}

function finishWithError(error: unknown) {
  clearActiveTimeout();
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  currentRun.state = 'error';
  currentRun.error = message;
  elements.status.textContent = 'Runner error.';
  elements.result.textContent = message;
  appendLog(message);
  sync();
}

function reset(testPath: string) {
  clearActiveTimeout();
  activeWorker?.terminate();
  activeWorker = undefined;
  currentRun = createRun('running', testPath);
  sync();
  elements.status.textContent = 'Preparing WPT source…';
  elements.result.textContent = 'Waiting for testharness completion…';
  elements.log.textContent = '';
  elements.original.textContent = 'Loading…';
  elements.harness.textContent = 'Loading…';
  elements.generated.textContent = 'Loading…';
}

function createRun(state: WptRunRecord['state'], path: string): WptRunRecord {
  return {state, path, warnings: [], logs: []};
}

function appendLog(message: string) {
  currentRun.logs.push(message);
  elements.log.textContent += `${message}\n`;
  sync();
}

function sync() {
  window.__WPT_LAST_RUN__ = {
    ...currentRun,
    warnings: [...currentRun.warnings],
    logs: [...currentRun.logs],
  };
}

function hasFailures(result: WptHarnessResult) {
  return (
    result.status.status !== 0 || result.tests.some((test) => test.status !== 0)
  );
}

function clearActiveTimeout() {
  if (activeTimeout) clearTimeout(activeTimeout);
  activeTimeout = undefined;
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

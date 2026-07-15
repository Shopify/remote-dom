/// <reference lib="webworker" />

import {Window} from '@remote-dom/polyfill';
import type {WorkerRequest, WorkerResponse} from './types.ts';

const workerGlobal = globalThis as unknown as DedicatedWorkerGlobalScope;
const nativePostMessage = workerGlobal.postMessage.bind(workerGlobal);
const nativeConsole = globalThis.console;
const nativeAddEventListener = workerGlobal.addEventListener.bind(workerGlobal);

function respond(message: WorkerResponse) {
  nativePostMessage(message);
}

nativeAddEventListener('error', (event) => {
  respond({type: 'error', error: formatError(event.error ?? event.message)});
});

nativeAddEventListener('unhandledrejection', (event) => {
  respond({type: 'error', error: formatError(event.reason)});
});

workerGlobal.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'run') return;
  void run(event.data);
};

async function run(request: Extract<WorkerRequest, {type: 'run'}>) {
  try {
    const window = new Window();
    Window.setGlobalThis(window);
    Object.defineProperty(globalThis, 'postMessage', {
      configurable: true,
      value: nativePostMessage,
      writable: true,
    });
    installConsoleTransport();
    respond({type: 'ready'});

    const AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor as new (source: string) => () => Promise<void>;
    await new AsyncFunction(
      `${request.source}\n//# sourceURL=wpt:${request.path}`,
    )();
  } catch (error) {
    respond({type: 'error', error: formatError(error)});
  }
}

function installConsoleTransport() {
  const transported = Object.create(nativeConsole) as Console;
  for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
    transported[level] = (...values: unknown[]) => {
      respond({type: 'log', level, text: values.map(formatValue).join(' ')});
      nativeConsole[level](...values);
    };
  }
  Object.defineProperty(globalThis, 'console', {
    configurable: true,
    value: transported,
    writable: true,
  });
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.stack || error.message : String(error);
}

/// <reference lib="webworker" />

import {Window} from '@remote-dom/polyfill';
import type {
  WorkerRequest,
  WorkerResponse,
  WptHarnessResult,
  WptHarnessStatus,
  WptHarnessTestResult,
} from './types.ts';

const workerGlobal = globalThis as unknown as DedicatedWorkerGlobalScope;
const nativeConsole = globalThis.console;
const nativeAddEventListener = workerGlobal.addEventListener.bind(workerGlobal);
let responsePort: MessagePort | undefined;
let harnessReady = false;

interface WptHarnessGlobal {
  add_completion_callback?: (
    callback: (tests: WptHarnessTestResult[], status: WptHarnessStatus) => void,
  ) => void;
  setup?: (...arguments_: unknown[]) => unknown;
  window?: {setup?: (...arguments_: unknown[]) => unknown};
}

function respond(message: WorkerResponse) {
  responsePort?.postMessage(message);
}

nativeAddEventListener('error', (event) => {
  respond({type: 'error', error: formatError(event.error ?? event.message)});
});

nativeAddEventListener('unhandledrejection', (event) => {
  respond({type: 'error', error: formatError(event.reason)});
});

nativeAddEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'run') return;
  void run(event.data);
});

async function run(request: WorkerRequest) {
  responsePort = request.responsePort;

  try {
    const window = new Window();
    Window.setGlobalThis(window);
    installWindowPostMessage(window);
    installHarnessReadyHook();
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

function installWindowPostMessage(window: Window) {
  const windowPostMessage = Reflect.get(window, 'postMessage');

  // The native worker method posts outward to the ignored public channel; it
  // does not implement Window messaging. Keep the missing capability
  // replaceable, and preserve a future implementation supplied by Window.
  Object.defineProperty(globalThis, 'postMessage', {
    configurable: true,
    value:
      typeof windowPostMessage === 'function'
        ? windowPostMessage.bind(window)
        : undefined,
    writable: typeof windowPostMessage === 'function',
  });
}

function installHarnessReadyHook() {
  Object.defineProperty(globalThis, '__REMOTE_DOM_WPT_HARNESS_READY__', {
    configurable: false,
    value: registerHarnessCompletion,
    writable: false,
  });
}

function registerHarnessCompletion() {
  if (harnessReady) return;

  const scope = globalThis as unknown as WptHarnessGlobal;
  const originalSetup = scope.setup;
  const addCompletionCallback = scope.add_completion_callback;
  if (!originalSetup || !addCompletionCallback) {
    throw new Error('WPT testharness did not install its expected globals.');
  }
  harnessReady = true;

  const wrappedSetup = function (this: unknown, ...arguments_: unknown[]) {
    if (arguments_.length === 1 && typeof arguments_[0] === 'function') {
      return originalSetup(arguments_[0], {});
    }
    return originalSetup.apply(this, arguments_);
  };
  scope.setup = wrappedSetup;
  if (scope.window) scope.window.setup = wrappedSetup;

  wrappedSetup({output: false});
  addCompletionCallback((tests, status) => {
    try {
      respond({
        type: 'complete',
        result: serializeHarnessResult(tests, status),
      });
    } catch (error) {
      respond({type: 'error', error: formatError(error)});
    }
  });
}

function serializeHarnessResult(
  tests: WptHarnessTestResult[],
  status: WptHarnessStatus,
): WptHarnessResult {
  return {
    tests: tests.map((test) => ({
      name: test.name,
      status: test.status,
      message: test.message,
      stack: test.stack,
    })),
    status: {
      status: status.status,
      message: status.message,
      stack: status.stack,
    },
  };
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

import type {
  WorkerLogLevel,
  WorkerResponse,
  WorkerRunRequest,
  WptHarnessResult,
  WptHarnessStatus,
  WptHarnessTestResult,
} from './types.ts';

interface WorkerExecutionOptions {
  request: WorkerRunRequest;
  signal: AbortSignal;
  timeoutMs: number;
  onLog(message: Extract<WorkerResponse, {type: 'log'}>): void;
  onReady(): void;
}

const logLevels = new Set<WorkerLogLevel>([
  'debug',
  'info',
  'log',
  'warn',
  'error',
]);

export function executeWorker(
  worker: Worker,
  {request, signal, timeoutMs, onLog, onReady}: WorkerExecutionOptions,
): Promise<WptHarnessResult> {
  const channel = new MessageChannel();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;

  // Terminal handlers only settle this promise. Promise first-settlement
  // semantics make the earliest completion, error, timeout, or abort final.
  const completion = new Promise<WptHarnessResult>((resolve, reject) => {
    abort = () =>
      reject(
        signal.reason ??
          new DOMException('Worker execution aborted.', 'AbortError'),
      );
    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener('abort', abort, {once: true});
    worker.onerror = (event) => reject(event.error ?? new Error(event.message));
    channel.port1.onmessageerror = () =>
      reject(new Error('Could not deserialize a WPT worker message.'));
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      try {
        const message = parseWorkerResponse(event.data);
        if (message.type === 'ready') {
          onReady();
        } else if (message.type === 'log') {
          onLog(message);
        } else if (message.type === 'complete') {
          resolve(message.result);
        } else {
          reject(new Error(message.error));
        }
      } catch (error) {
        reject(error);
      }
    };
    channel.port1.start();

    timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for testharness completion.`,
        ),
      );
    }, timeoutMs);
    worker.postMessage({...request, responsePort: channel.port2}, [
      channel.port2,
    ]);
  });

  return completion.finally(() => {
    if (timeout !== undefined) clearTimeout(timeout);
    if (abort) signal.removeEventListener('abort', abort);
    worker.onerror = null;
    channel.port1.onmessage = null;
    channel.port1.onmessageerror = null;
    channel.port1.close();
    worker.terminate();
  });
}

export function parseWorkerResponse(value: unknown): WorkerResponse {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw malformedWorkerMessage();
  }

  if (value.type === 'ready') return {type: 'ready'};
  if (value.type === 'log') {
    if (!isLogLevel(value.level) || typeof value.text !== 'string') {
      throw malformedWorkerMessage();
    }
    return {type: 'log', level: value.level, text: value.text};
  }
  if (value.type === 'error') {
    if (typeof value.error !== 'string') throw malformedWorkerMessage();
    return {type: 'error', error: value.error};
  }
  if (value.type === 'complete') {
    return {type: 'complete', result: parseHarnessResult(value.result)};
  }

  throw malformedWorkerMessage();
}

function parseHarnessResult(value: unknown): WptHarnessResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.tests) ||
    !isHarnessStatus(value.status)
  ) {
    throw malformedWorkerMessage();
  }

  const tests = value.tests.map((test) => {
    if (!isHarnessTestResult(test)) throw malformedWorkerMessage();
    return test;
  });
  return {tests, status: value.status};
}

function isHarnessTestResult(value: unknown): value is WptHarnessTestResult {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isStatusCode(value.status) &&
    isOptionalString(value.message) &&
    isOptionalString(value.stack)
  );
}

function isHarnessStatus(value: unknown): value is WptHarnessStatus {
  return (
    isRecord(value) &&
    isStatusCode(value.status) &&
    isOptionalString(value.message) &&
    isOptionalString(value.stack)
  );
}

function isStatusCode(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string';
}

function isLogLevel(value: unknown): value is WorkerLogLevel {
  return typeof value === 'string' && logLevels.has(value as WorkerLogLevel);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function malformedWorkerMessage() {
  return new Error('Received a malformed WPT worker message.');
}

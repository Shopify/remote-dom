import type {WorkerRequest, WorkerResponse, WptHarnessResult} from './types.ts';

interface WorkerExecutionOptions {
  request: WorkerRequest;
  signal: AbortSignal;
  timeoutMs: number;
  onLog(message: Extract<WorkerResponse, {type: 'log'}>): void;
  onReady(): void;
}

export function executeWorker(
  worker: Worker,
  {request, signal, timeoutMs, onLog, onReady}: WorkerExecutionOptions,
): Promise<WptHarnessResult> {
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
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      try {
        const message = event.data;
        if (message.type === 'ready') {
          onReady();
        } else if (message.type === 'log') {
          onLog(message);
        } else if (message.type === 'complete') {
          resolve(message.result);
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      } catch (error) {
        reject(error);
      }
    };

    timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for testharness completion.`,
        ),
      );
    }, timeoutMs);
    worker.postMessage(request);
  });

  return completion.finally(() => {
    if (timeout !== undefined) clearTimeout(timeout);
    if (abort) signal.removeEventListener('abort', abort);
    worker.onerror = null;
    worker.onmessage = null;
    worker.terminate();
  });
}

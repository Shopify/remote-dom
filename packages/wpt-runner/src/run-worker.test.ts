import {describe, expect, it, vi} from 'vitest';
import {executeWorker} from './run-worker.ts';
import type {WorkerRequest, WorkerResponse, WptHarnessResult} from './types.ts';

const request: WorkerRequest = {
  type: 'run',
  path: 'fixture.html',
  source: 'test(() => {}, "fixture");',
};
const passingResult: WptHarnessResult = {
  tests: [{name: 'fixture', status: 0}],
  status: {status: 0},
};

class FakeWorker {
  onerror: Worker['onerror'] = null;
  onmessage: Worker['onmessage'] = null;
  posted: unknown[] = [];
  terminated = false;

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(message: WorkerResponse) {
    this.onmessage?.call(
      this as unknown as Worker,
      new MessageEvent('message', {data: message}),
    );
  }

  emitError(error: Error) {
    this.onerror?.call(
      this as unknown as Worker,
      {
        error,
        message: error.message,
      } as ErrorEvent,
    );
  }
}

function startExecution({
  controller = new AbortController(),
  timeoutMs = 1_000,
} = {}) {
  const worker = new FakeWorker();
  const onLog = vi.fn();
  const onReady = vi.fn();
  const completion = executeWorker(worker as unknown as Worker, {
    request,
    signal: controller.signal,
    timeoutMs,
    onLog,
    onReady,
  });
  return {completion, controller, onLog, onReady, worker};
}

describe('worker execution', () => {
  it('keeps an error as the terminal outcome when completion follows', async () => {
    const {completion, worker} = startExecution();
    const error = new Error('worker failed');

    worker.emitError(error);
    worker.emitMessage({type: 'complete', result: passingResult});

    await expect(completion).rejects.toBe(error);
    expect(worker.terminated).toBe(true);
  });

  it('keeps completion as the terminal outcome when an error follows', async () => {
    const {completion, worker} = startExecution();

    worker.emitMessage({type: 'complete', result: passingResult});
    worker.emitError(new Error('late worker error'));

    await expect(completion).resolves.toBe(passingResult);
    expect(worker.terminated).toBe(true);
  });

  it('rejects on timeout and terminates the worker', async () => {
    vi.useFakeTimers();
    try {
      const {completion, worker} = startExecution({timeoutMs: 50});
      const rejection = expect(completion).rejects.toThrow(
        'Timed out after 50ms waiting for testharness completion.',
      );

      await vi.advanceTimersByTimeAsync(50);
      await rejection;
      expect(worker.terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects on cancellation and terminates the worker', async () => {
    const {completion, controller, worker} = startExecution();
    const reason = new DOMException('Superseded by a new run.', 'AbortError');

    controller.abort(reason);

    await expect(completion).rejects.toBe(reason);
    expect(worker.terminated).toBe(true);
  });

  it('forwards nonterminal ready and log messages', async () => {
    const {completion, onLog, onReady, worker} = startExecution();
    const log = {type: 'log', level: 'info', text: 'hello'} as const;

    worker.emitMessage({type: 'ready'});
    worker.emitMessage(log);
    worker.emitMessage({type: 'complete', result: passingResult});

    await completion;
    expect(onReady).toHaveBeenCalledOnce();
    expect(onLog).toHaveBeenCalledWith(log);
  });
});

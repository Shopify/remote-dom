import {describe, expect, it, vi} from 'vitest';
import {executeWorker} from './run-worker.ts';
import type {
  WorkerRequest,
  WorkerRunRequest,
  WptHarnessResult,
} from './types.ts';

const request: WorkerRunRequest = {
  type: 'run',
  path: 'fixture.html',
  source: 'test(() => {}, "fixture");',
};
const passingResult: WptHarnessResult = {
  tests: [{name: 'fixture', status: 0, message: null, stack: null}],
  status: {status: 0, message: null, stack: null},
};

class FakeWorker {
  onerror: Worker['onerror'] = null;
  onmessage: Worker['onmessage'] = null;
  posted: WorkerRequest[] = [];
  terminated = false;

  postMessage(message: WorkerRequest) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
    this.posted.at(-1)?.responsePort.close();
  }

  emitControlMessage(message: unknown) {
    const port = this.posted.at(-1)?.responsePort;
    if (!port) throw new Error('Worker has no response port.');
    port.postMessage(message);
  }

  emitPublicMessage(message: unknown) {
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
    worker.emitControlMessage({type: 'complete', result: passingResult});

    await expect(completion).rejects.toBe(error);
    expect(worker.terminated).toBe(true);
  });

  it('keeps completion as the terminal outcome when an error follows', async () => {
    const {completion, worker} = startExecution();

    worker.emitControlMessage({type: 'complete', result: passingResult});
    worker.emitControlMessage({type: 'error', error: 'late worker error'});

    await expect(completion).resolves.toEqual(passingResult);
    expect(worker.terminated).toBe(true);
  });

  it('ignores messages forged on the worker public channel', async () => {
    const {completion, worker} = startExecution();

    worker.emitPublicMessage({type: 'complete', result: passingResult});
    worker.emitControlMessage({type: 'error', error: 'trusted failure'});

    await expect(completion).rejects.toThrow('trusted failure');
  });

  it.each([
    null,
    {},
    {type: 'unknown'},
    {type: 'log', level: 'unknown', text: 'hello'},
    {type: 'error', error: 42},
    {type: 'complete', result: null},
    {
      type: 'complete',
      result: {
        tests: [{name: 'fixture', status: 'passed'}],
        status: {status: 0},
      },
    },
  ])('rejects malformed control message %#', async (message) => {
    const {completion, worker} = startExecution();

    worker.emitControlMessage(message);

    await expect(completion).rejects.toThrow(
      'Received a malformed WPT worker message.',
    );
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

    worker.emitControlMessage({type: 'ready'});
    worker.emitControlMessage(log);
    worker.emitControlMessage({type: 'complete', result: passingResult});

    await completion;
    expect(onReady).toHaveBeenCalledOnce();
    expect(onLog).toHaveBeenCalledWith(log);
  });
});

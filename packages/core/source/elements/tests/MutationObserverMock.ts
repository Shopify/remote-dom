import {vi} from 'vitest';

export class MutationObserverMock {
  public readonly emitMutation = vi.fn<[MutationRecord[]], void>();

  public constructor(cb: MutationCallback) {
    this.emitMutation.mockImplementation((records) => cb(records, {} as never));
  }
}

type MutationObserver = typeof globalThis.MutationObserver;

globalThis.MutationObserver =
  MutationObserverMock as unknown as MutationObserver;

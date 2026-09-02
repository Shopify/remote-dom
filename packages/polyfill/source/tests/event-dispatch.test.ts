import {describe, expect, it, vi} from 'vitest';

import {Event} from '../Event.ts';
import {EventTarget} from '../EventTarget.ts';
import {Window} from '../Window.ts';

describe('EventTarget dispatch lifecycle', () => {
  it('resets stopped propagation before redispatching an event', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const event = new Event('change');

    target.addEventListener('change', (event) => event.stopPropagation(), {
      capture: true,
      once: true,
    });
    target.addEventListener('change', listener);

    target.dispatchEvent(event);
    expect(listener).not.toHaveBeenCalled();

    target.dispatchEvent(event);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('resets stopped immediate propagation before redispatching an event', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const event = new Event('change');

    target.addEventListener(
      'change',
      (event) => event.stopImmediatePropagation(),
      {once: true},
    );
    target.addEventListener('change', listener);

    target.dispatchEvent(event);
    expect(listener).not.toHaveBeenCalled();

    target.dispatchEvent(event);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('rejects in-flight redispatch and permits redispatch after completion', () => {
    const target = new EventTarget();
    const event = new Event('change');
    let redispatchError: unknown;

    target.addEventListener(
      'change',
      () => {
        try {
          target.dispatchEvent(event);
        } catch (error) {
          redispatchError = error;
        }
      },
      {once: true},
    );

    expect(target.dispatchEvent(event)).toBe(true);
    expect(redispatchError).toBeInstanceOf(DOMException);
    expect((redispatchError as DOMException).name).toBe('InvalidStateError');
    expect(target.dispatchEvent(event)).toBe(true);
  });

  it('names in-flight redispatch errors without a global DOMException', () => {
    const target = new EventTarget();
    const event = new Event('change');
    let redispatchError: unknown;

    vi.stubGlobal('DOMException', undefined);
    try {
      target.addEventListener(
        'change',
        () => {
          try {
            target.dispatchEvent(event);
          } catch (error) {
            redispatchError = error;
          }
        },
        {once: true},
      );

      target.dispatchEvent(event);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(redispatchError).toBeInstanceOf(Error);
    expect(redispatchError).toMatchObject({
      name: 'InvalidStateError',
      message: expect.stringContaining('already being dispatched'),
    });
  });

  it('defers listeners added during dispatch until the next dispatch', () => {
    const target = new EventTarget();
    const addedListener = vi.fn();

    target.addEventListener('change', () => {
      target.addEventListener('change', addedListener);
    });

    target.dispatchEvent(new Event('change'));
    expect(addedListener).not.toHaveBeenCalled();

    target.dispatchEvent(new Event('change'));
    expect(addedListener).toHaveBeenCalledOnce();
  });

  it('defers a function listener removed and re-added during dispatch', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    let firstDispatch = true;

    target.addEventListener('change', () => {
      if (!firstDispatch) return;
      firstDispatch = false;
      target.removeEventListener('change', listener);
      target.addEventListener('change', listener);
    });
    target.addEventListener('change', listener);

    target.dispatchEvent(new Event('change'));
    expect(listener).not.toHaveBeenCalled();

    target.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('defers a listener object removed and re-added during dispatch', () => {
    const target = new EventTarget();
    const listener = {handleEvent: vi.fn()};
    let firstDispatch = true;

    target.addEventListener('change', () => {
      if (!firstDispatch) return;
      firstDispatch = false;
      target.removeEventListener('change', listener);
      target.addEventListener('change', listener);
    });
    target.addEventListener('change', listener);

    target.dispatchEvent(new Event('change'));
    expect(listener.handleEvent).not.toHaveBeenCalled();

    target.dispatchEvent(new Event('change'));
    expect(listener.handleEvent).toHaveBeenCalledOnce();
  });

  it('skips a snapshotted listener whose signal is aborted during dispatch', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();

    target.addEventListener('change', () => controller.abort());
    target.addEventListener('change', listener, {signal: controller.signal});

    target.dispatchEvent(new Event('change'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('returns defensive copies that cannot corrupt event traversal', () => {
    const window = new Window();
    const parent = window.document.createElement('div');
    const target = window.document.createElement('button');
    const targetListener = vi.fn((event: globalThis.Event) =>
      event.composedPath(),
    );
    parent.appendChild(target);

    parent.addEventListener(
      'change',
      (event) => {
        event.composedPath().length = 0;
      },
      {capture: true},
    );
    target.addEventListener('change', targetListener);

    target.dispatchEvent(new Event('change', {bubbles: true}));

    expect(targetListener).toHaveBeenCalledOnce();
    expect(targetListener.mock.results[0]!.value).toEqual([target, parent]);
  });

  it('skips snapshotted listeners removed during dispatch', () => {
    const target = new EventTarget();
    const removedListener = vi.fn();

    target.addEventListener('change', () => {
      target.removeEventListener('change', removedListener);
    });
    target.addEventListener('change', removedListener);

    target.dispatchEvent(new Event('change'));

    expect(removedListener).not.toHaveBeenCalled();
  });

  it('normalizes transient state after dispatch', () => {
    const target = new EventTarget();
    const event = new Event('change');
    let stateDuringDispatch:
      | {
          eventPhase: number;
          currentTarget: globalThis.EventTarget | null;
          path: globalThis.EventTarget[];
        }
      | undefined;

    target.addEventListener('change', (event) => {
      stateDuringDispatch = {
        eventPhase: event.eventPhase,
        currentTarget: event.currentTarget,
        path: event.composedPath(),
      };
      event.stopPropagation();
    });

    target.dispatchEvent(event);

    expect(stateDuringDispatch).toEqual({
      eventPhase: Event.AT_TARGET,
      currentTarget: target,
      path: [target],
    });
    expect(event.eventPhase).toBe(Event.NONE);
    expect(event.currentTarget).toBeNull();
    expect(event.composedPath()).toEqual([]);
    expect(event.cancelBubble).toBe(false);
  });
});

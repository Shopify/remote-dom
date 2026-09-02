import {describe, expect, it, vi} from 'vitest';

import {Event} from '../Event.ts';
import {EventTarget} from '../EventTarget.ts';

describe('EventTarget listener registration', () => {
  it('deduplicates listeners by type, callback, and capture', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener);
    target.addEventListener('change', listener, false);
    target.addEventListener('change', listener, {capture: false});

    target.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('treats capture and non-capture registrations as distinct', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener);
    target.addEventListener('change', listener, true);
    target.removeEventListener('change', listener, false);

    target.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledOnce();

    target.removeEventListener('change', listener, true);
    target.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('keeps colliding event names in separate capture lists', () => {
    const target = new EventTarget();
    const nameListener = vi.fn();
    const nameWithMarkerListener = vi.fn();

    target.addEventListener('name', nameListener, true);
    target.addEventListener('name@', nameWithMarkerListener);

    target.dispatchEvent(new Event('name'));
    expect(nameListener).toHaveBeenCalledOnce();
    expect(nameWithMarkerListener).not.toHaveBeenCalled();

    target.dispatchEvent(new Event('name@'));
    expect(nameListener).toHaveBeenCalledOnce();
    expect(nameWithMarkerListener).toHaveBeenCalledOnce();
  });

  it('removes colliding event names by type and capture', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('name', listener, true);
    target.addEventListener('name@', listener);

    target.removeEventListener('name', listener, false);
    target.removeEventListener('name@', listener, true);
    target.dispatchEvent(new Event('name'));
    target.dispatchEvent(new Event('name@'));
    expect(listener).toHaveBeenCalledTimes(2);

    listener.mockClear();
    target.removeEventListener('name', listener, true);
    target.dispatchEvent(new Event('name@'));
    expect(listener).toHaveBeenCalledOnce();

    target.removeEventListener('name@', listener);
    target.dispatchEvent(new Event('name@'));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not orphan a once listener when removing the wrong capture mode', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener, {once: true});
    target.removeEventListener('change', listener, true);
    target.removeEventListener('change', listener);

    target.dispatchEvent(new Event('change'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps once listeners distinct across event types', () => {
    const target = new EventTarget();
    const listener = vi.fn((event: globalThis.Event) => event.type);

    target.addEventListener('start', listener, {once: true});
    target.addEventListener('finish', listener, {once: true});

    target.dispatchEvent(new Event('start'));
    target.dispatchEvent(new Event('start'));
    target.dispatchEvent(new Event('finish'));
    target.dispatchEvent(new Event('finish'));

    expect(listener.mock.results.map(({value}) => value)).toEqual([
      'start',
      'finish',
    ]);
  });

  it('deduplicates once listeners and removes them after dispatch', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener, {once: true});
    target.addEventListener('change', listener, {once: true});

    target.dispatchEvent(new Event('change'));
    target.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('uses the registered capture value when removing a once listener', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const options = {capture: false, once: true};

    target.addEventListener('change', listener, options);
    options.capture = true;

    target.dispatchEvent(new Event('change'));
    target.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not register a listener with an already-aborted signal', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();
    controller.abort();

    target.addEventListener('change', listener, {
      signal: controller.signal,
    });
    target.dispatchEvent(new Event('change'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('removes a registered listener when its signal aborts', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();

    target.addEventListener('change', listener, {
      signal: controller.signal,
    });
    target.dispatchEvent(new Event('change'));
    controller.abort();
    target.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('uses the registered capture value when a signal removes a listener', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();
    const options = {capture: false, signal: controller.signal};

    target.addEventListener('change', listener, options);
    options.capture = true;
    controller.abort();
    target.dispatchEvent(new Event('change'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not invoke a signal listener during an earlier abort handler', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();

    controller.signal.addEventListener('abort', () => {
      target.dispatchEvent(new Event('change'));
    });
    target.addEventListener('change', listener, {signal: controller.signal});

    controller.abort();

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not let an old signal remove a later registration', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const controller = new AbortController();

    target.addEventListener('change', listener, {
      signal: controller.signal,
    });
    target.removeEventListener('change', listener);
    target.addEventListener('change', listener);

    controller.abort();
    target.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });
});

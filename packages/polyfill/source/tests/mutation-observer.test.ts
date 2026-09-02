import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Window} from '../Window.ts';

beforeEach(() => {
  Window.setGlobalThis(new Window());
});

describe('MutationObserver', () => {
  it('installs the standard observer method surface', () => {
    expect(typeof MutationObserver).toBe('function');

    const observer = new MutationObserver(() => {});

    expect(typeof observer.observe).toBe('function');
    expect(typeof observer.disconnect).toBe('function');
    expect(typeof observer.takeRecords).toBe('function');
  });

  it('supports feature-detected method calls without producing records', () => {
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    expect(() => observer.observe(document, {childList: true})).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
    expect(observer.takeRecords()).toEqual([]);
    expect(callback).not.toHaveBeenCalled();
  });

  it('allows subclasses to call the base observe method', () => {
    class ExtendedMutationObserver extends MutationObserver {
      observe(target: Node, options?: MutationObserverInit) {
        super.observe(target, options);
      }
    }

    const observer = new ExtendedMutationObserver(() => {});

    expect(() => observer.observe(document, {childList: true})).not.toThrow();
  });
});

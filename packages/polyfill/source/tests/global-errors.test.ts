import {ErrorEvent} from '../ErrorEvent.ts';
import {PromiseRejectionEvent} from '../PromiseRejectionEvent.ts';
import {Window} from '../Window.ts';
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';

describe('global errors', () => {
  describe('onerror', () => {
    let originalOnerror: any;

    beforeEach(() => {
      originalOnerror = globalThis.onerror;
    });

    afterEach(() => {
      globalThis.onerror = originalOnerror;
    });

    it('sets onerror handler on window instance', () => {
      const handler = vi.fn();
      const window = new Window();

      window.onerror = handler;
      expect(window.onerror).toBe(handler);
    });

    it('overrides onerror handler on window instance', () => {
      const handler = vi.fn();
      const handler2 = vi.fn();

      const window = new Window();
      window.onerror = handler;
      window.onerror = handler2;

      expect(window.onerror).toBe(handler2);
    });

    it('calls handler when error occurs', () => {
      const handler = vi.fn();
      const window = new Window();

      const error = new Error('test');

      window.onerror = handler;
      window.dispatchEvent(
        new ErrorEvent('error', {
          error,
          filename: 'test.ts',
          lineno: 1,
          colno: 1,
        }),
      );

      expect(handler).toHaveBeenCalledWith('Error', 'test.ts', 1, 1, error);
    });

    it('allows null assignment', () => {
      const handler = vi.fn();
      const window = new Window();
      window.onerror = handler;
      expect(window.onerror).toBe(handler);

      window.onerror = null;
      expect(window.onerror).toBe(null);
    });

    it('works when window is set as global', () => {
      const window = new Window();
      Window.setGlobalThis(window);
      const handler = vi.fn();
      window.onerror = handler;

      expect(window.onerror).toBe(handler);
    });
  });

  describe('onunhandledrejection', () => {
    let originalOnunhandledrejection: any;

    beforeEach(() => {
      originalOnunhandledrejection = globalThis.onunhandledrejection;
    });

    afterEach(() => {
      globalThis.onunhandledrejection = originalOnunhandledrejection;
    });

    it('sets onunhandledrejection handler on window instance', () => {
      const handler = vi.fn();
      const window = new Window();

      window.onunhandledrejection = handler;
      expect(window.onunhandledrejection).toBe(handler);
    });

    it('overrides onunhandledrejection handler on window instance', () => {
      const handler = vi.fn();
      const handler2 = vi.fn();
      const window = new Window();

      window.onunhandledrejection = handler;
      window.onunhandledrejection = handler2;
      expect(window.onunhandledrejection).toBe(handler2);
    });

    it('calls handler when unhandled rejection occurs', () => {
      const handler = vi.fn();
      const window = new Window();
      window.onunhandledrejection = handler;

      const error = new Error('test');
      const promise = Promise.resolve();

      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', {
          promise: promise,
          reason: error,
        }),
      );

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          promise,
          reason: error,
        }),
      );

      expect(handler).toHaveBeenCalledWith(expect.any(PromiseRejectionEvent));
    });

    it('allows null assignment', () => {
      const handler = vi.fn();
      const window = new Window();
      window.onunhandledrejection = handler;
      expect(window.onunhandledrejection).toBe(handler);

      window.onunhandledrejection = null;
      expect(window.onunhandledrejection).toBe(null);
    });

    it('works when window is set as global', () => {
      const window = new Window();
      Window.setGlobalThis(window);
      const handler = vi.fn();
      window.onunhandledrejection = handler;

      expect(window.onunhandledrejection).toBe(handler);
    });
  });
});

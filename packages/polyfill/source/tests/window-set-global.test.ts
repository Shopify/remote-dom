import {afterEach, describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../constants.ts';
import {ErrorEvent} from '../ErrorEvent.ts';
import {Event} from '../Event.ts';
import {PromiseRejectionEvent} from '../PromiseRejectionEvent.ts';
import {Window} from '../Window.ts';

const originalGlobalProperties = Object.getOwnPropertyDescriptors(globalThis);

afterEach(() => {
  for (const property of Reflect.ownKeys(globalThis)) {
    if (
      !Object.prototype.hasOwnProperty.call(originalGlobalProperties, property)
    ) {
      Reflect.deleteProperty(globalThis, property);
    }
  }

  Object.defineProperties(globalThis, originalGlobalProperties);
});

function expectCompleteEventTarget(target: any, window: Window) {
  const listener = vi.fn();
  target.addEventListener('test', listener);
  target.dispatchEvent(new Event('test'));
  expect(listener).toHaveBeenCalledOnce();

  target.removeEventListener('test', listener);
  target.dispatchEvent(new Event('test'));
  expect(listener).toHaveBeenCalledOnce();

  const errorHandler = vi.fn();
  target.onerror = errorHandler;
  expect(target.onerror).toBe(errorHandler);
  expect(window.onerror).toBe(errorHandler);

  target.dispatchEvent(new ErrorEvent('error', {message: 'test'}));
  expect(errorHandler).toHaveBeenCalledOnce();

  const rejectionHandler = vi.fn();
  target.onunhandledrejection = rejectionHandler;
  expect(target.onunhandledrejection).toBe(rejectionHandler);
  expect(window.onunhandledrejection).toBe(rejectionHandler);

  target.dispatchEvent(
    new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('test'),
    }),
  );
  expect(rejectionHandler).toHaveBeenCalledOnce();
}

describe('Window global installation', () => {
  describe('setGlobal()', () => {
    it('installs and reinstalls all globals when self does not exist', () => {
      delete (globalThis as any).self;

      const firstWindow = new Window();
      const firstDocument = firstWindow.document;
      Window.setGlobal(firstWindow);

      expect(globalThis.window).toBe(firstWindow);
      expect(globalThis.self).toBe(firstWindow);
      expectCompleteEventTarget(globalThis, firstWindow);

      const secondWindow = new Window();
      Window.setGlobal(secondWindow);

      expect(globalThis.window).toBe(secondWindow);
      expect(globalThis.self).toBe(secondWindow);
      expect(globalThis.document).toBe(secondWindow.document);
      expectCompleteEventTarget(globalThis, secondWindow);

      expect(firstWindow.window).toBe(firstWindow);
      expect(firstWindow.self).toBe(firstWindow);
      expect(firstWindow.document).toBe(firstDocument);
    });

    it('preserves and updates an existing self across installations', () => {
      const existingSelf = {} as any;
      Object.defineProperty(globalThis, 'self', {
        configurable: true,
        value: existingSelf,
        writable: true,
      });

      const firstWindow = new Window();
      Window.setGlobal(firstWindow);

      expect(globalThis.self).toBe(existingSelf);
      expect(existingSelf.window).toBe(firstWindow);
      expect(existingSelf.document).toBe(firstWindow.document);
      expectCompleteEventTarget(existingSelf, firstWindow);

      const secondWindow = new Window();
      Window.setGlobal(secondWindow);

      expect(globalThis.self).toBe(existingSelf);
      expect(existingSelf.window).toBe(secondWindow);
      expect(existingSelf.document).toBe(secondWindow.document);
      expectCompleteEventTarget(existingSelf, secondWindow);
      expectCompleteEventTarget(globalThis, secondWindow);
    });

    it('preserves native event properties on global and worker targets', () => {
      const globalAddEventListener = vi.fn();
      const globalRemoveEventListener = vi.fn();
      const globalDispatchEvent = vi.fn();
      let globalOnerror: unknown = null;
      let globalOnunhandledrejection: unknown = null;

      Object.defineProperties(globalThis, {
        addEventListener: {
          configurable: true,
          value: globalAddEventListener,
        },
        removeEventListener: {
          configurable: true,
          value: globalRemoveEventListener,
        },
        dispatchEvent: {configurable: true, value: globalDispatchEvent},
        onerror: {
          configurable: true,
          get: () => globalOnerror,
          set: (handler) => {
            globalOnerror = handler;
          },
        },
        onunhandledrejection: {
          configurable: true,
          get: () => globalOnunhandledrejection,
          set: (handler) => {
            globalOnunhandledrejection = handler;
          },
        },
      });

      const workerAddEventListener = vi.fn();
      const workerRemoveEventListener = vi.fn();
      const workerDispatchEvent = vi.fn();
      let workerOnerror: unknown = null;
      let workerOnunhandledrejection: unknown = null;
      const workerPrototype = {};

      Object.defineProperties(workerPrototype, {
        addEventListener: {
          configurable: true,
          value: workerAddEventListener,
        },
        removeEventListener: {
          configurable: true,
          value: workerRemoveEventListener,
        },
        dispatchEvent: {configurable: true, value: workerDispatchEvent},
        onerror: {
          configurable: true,
          get: () => workerOnerror,
          set: (handler) => {
            workerOnerror = handler;
          },
        },
        onunhandledrejection: {
          configurable: true,
          get: () => workerOnunhandledrejection,
          set: (handler) => {
            workerOnunhandledrejection = handler;
          },
        },
      });

      const workerSelf = Object.create(workerPrototype);
      Object.defineProperty(globalThis, 'self', {
        configurable: true,
        value: workerSelf,
        writable: true,
      });

      const firstWindow = new Window();
      Window.setGlobal(firstWindow);

      expect(globalThis.addEventListener).toBe(globalAddEventListener);
      expect(globalThis.removeEventListener).toBe(globalRemoveEventListener);
      expect(globalThis.dispatchEvent).toBe(globalDispatchEvent);
      expect(workerSelf.addEventListener).toBe(workerAddEventListener);
      expect(workerSelf.removeEventListener).toBe(workerRemoveEventListener);
      expect(workerSelf.dispatchEvent).toBe(workerDispatchEvent);

      for (const property of [
        'addEventListener',
        'removeEventListener',
        'dispatchEvent',
        'onerror',
        'onunhandledrejection',
      ]) {
        expect(Object.hasOwn(workerSelf, property)).toBe(false);
      }

      const globalListener = vi.fn();
      globalThis.addEventListener('message', globalListener);
      globalThis.removeEventListener('message', globalListener);
      (globalThis.dispatchEvent as any)(new Event('message'));
      expect(globalAddEventListener).toHaveBeenCalledWith(
        'message',
        globalListener,
      );
      expect(globalRemoveEventListener).toHaveBeenCalledWith(
        'message',
        globalListener,
      );
      expect(globalDispatchEvent).toHaveBeenCalledOnce();

      const workerListener = vi.fn();
      workerSelf.addEventListener('message', workerListener);
      workerSelf.removeEventListener('message', workerListener);
      workerSelf.dispatchEvent(new Event('message'));
      expect(workerAddEventListener).toHaveBeenCalledWith(
        'message',
        workerListener,
      );
      expect(workerRemoveEventListener).toHaveBeenCalledWith(
        'message',
        workerListener,
      );
      expect(workerDispatchEvent).toHaveBeenCalledOnce();

      const globalErrorHandler = vi.fn();
      const workerErrorHandler = vi.fn();
      (globalThis as any).onerror = globalErrorHandler;
      workerSelf.onerror = workerErrorHandler;
      expect(globalOnerror).toBe(globalErrorHandler);
      expect(workerOnerror).toBe(workerErrorHandler);
      expect(firstWindow.onerror).toBe(null);

      const globalRejectionHandler = vi.fn();
      const workerRejectionHandler = vi.fn();
      (globalThis as any).onunhandledrejection = globalRejectionHandler;
      workerSelf.onunhandledrejection = workerRejectionHandler;
      expect(globalOnunhandledrejection).toBe(globalRejectionHandler);
      expect(workerOnunhandledrejection).toBe(workerRejectionHandler);
      expect(firstWindow.onunhandledrejection).toBe(null);

      const secondWindow = new Window();
      Window.setGlobal(secondWindow);

      expect(globalThis.addEventListener).toBe(globalAddEventListener);
      expect(workerSelf.addEventListener).toBe(workerAddEventListener);
      expect(workerSelf.document).toBe(secondWindow.document);
    });

    it('reinstalls globals from a distinct Window module copy', async () => {
      delete (globalThis as any).self;
      vi.resetModules();
      const {Window: FirstWindow} = await import('../Window.ts');
      vi.resetModules();
      const {Window: SecondWindow} = await import('../Window.ts');

      expect(SecondWindow).not.toBe(FirstWindow);

      const firstWindow = new FirstWindow();
      const firstDocument = firstWindow.document;
      FirstWindow.setGlobal(firstWindow);

      const secondWindow = new SecondWindow();
      SecondWindow.setGlobal(secondWindow);

      expect(globalThis.window).toBe(secondWindow);
      expect(globalThis.self).toBe(secondWindow);
      expect(globalThis.document).toBe(secondWindow.document);
      expect(firstWindow.window).toBe(firstWindow);
      expect(firstWindow.self).toBe(firstWindow);
      expect(firstWindow.document).toBe(firstDocument);

      const listener = vi.fn();
      globalThis.addEventListener('test', listener);
      secondWindow.dispatchEvent(new secondWindow.Event('test'));
      expect(listener).toHaveBeenCalledOnce();

      const errorHandler = vi.fn();
      globalThis.onerror = errorHandler;
      expect(secondWindow.onerror).toBe(errorHandler);
      expect(firstWindow.onerror).toBe(null);
    });
  });

  describe('setGlobalThis()', () => {
    it('installs and reinstalls the same complete global surface', () => {
      const existingSelf = {};
      Object.defineProperty(globalThis, 'self', {
        configurable: true,
        value: existingSelf,
        writable: true,
      });

      const firstWindow = new Window();
      Window.setGlobalThis(firstWindow);

      expect(globalThis.window).toBe(globalThis);
      expect(globalThis.self).toBe(globalThis);
      expectCompleteEventTarget(globalThis, firstWindow);

      const secondWindow = new Window();
      Window.setGlobalThis(secondWindow);

      expect(globalThis.window).toBe(globalThis);
      expect(globalThis.self).toBe(globalThis);
      expect(globalThis.document).toBe(secondWindow.document);
      expectCompleteEventTarget(globalThis, secondWindow);
    });
  });

  it('installs symbol-keyed Window state', () => {
    Window.setGlobal(new Window());
    expect(Object.hasOwn(globalThis, HOOKS)).toBe(true);
  });

  it('cleans symbol-keyed Window state between tests', () => {
    expect(Object.hasOwn(globalThis, HOOKS)).toBe(false);
  });
});

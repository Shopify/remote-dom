import type {MessageEndpoint} from '../types';

export function fromIframe(
  target: HTMLIFrameElement,
  {terminate: shouldTerminate = true, targetOrigin = '*'} = {},
): MessageEndpoint {
  if (typeof window === 'undefined') {
    throw new Error(
      `You can only run fromIframe() in a browser context, but no window was found.`,
    );
  }

  // We need to store the listener, because we wrap it to do some origin checking. Ideally,
  // we’d instead store an `AbortController`, and use its signal to cancel the listeners,
  // but that isn’t widely supported.
  const listenerMap = new WeakMap<
    (event: MessageEvent) => void,
    (event: MessageEvent) => void
  >();

  const iframeLoadPromise =
    target.contentDocument?.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          target.addEventListener('load', () => resolve(), {
            once: true,
          });
        });

  return {
    async postMessage(message, transfer) {
      if (target.contentDocument?.readyState !== 'complete') {
        await iframeLoadPromise;
      }

      target.contentWindow!.postMessage(message, targetOrigin, transfer);
    },
    addEventListener(event, listener) {
      const wrappedListener = (event: MessageEvent) => {
        if (event.source !== target.contentWindow) return;
        listener(event);
      };

      listenerMap.set(listener, wrappedListener);
      self.addEventListener(event, wrappedListener);
    },
    removeEventListener(event, listener) {
      const wrappedListener = listenerMap.get(listener);
      if (wrappedListener == null) return;

      listenerMap.delete(listener);
      self.removeEventListener(event, wrappedListener);
    },
    terminate() {
      if (shouldTerminate) target.remove();
    },
  };
}

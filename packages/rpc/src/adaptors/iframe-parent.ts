import type {MessageEndpoint} from '../types';

import {READY_MESSAGE_KEY} from './constants';

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

  let resolveIFrameReadyPromise: () => void;

  function onMessage(event: MessageEvent<any>) {
    if (event.source !== target.contentWindow) return;

    if (event.data === READY_MESSAGE_KEY) {
      window.removeEventListener('message', onMessage);
      resolveIFrameReadyPromise();
    }
  }

  target.contentWindow?.postMessage(READY_MESSAGE_KEY, targetOrigin);

  const iframeReadyPromise = new Promise<void>((resolve) => {
    resolveIFrameReadyPromise = resolve;
    window.addEventListener('message', onMessage);
  });

  return {
    async postMessage(message, transfer) {
      await iframeReadyPromise;

      target.contentWindow?.postMessage(message, targetOrigin, transfer);
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
      window.removeEventListener('message', onMessage);

      if (shouldTerminate) target.remove();
    },
  };
}

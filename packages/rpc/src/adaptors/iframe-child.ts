import type {MessageEndpoint} from '../types';

export function fromInsideIframe({targetOrigin = '*'} = {}): MessageEndpoint {
  if (typeof self === 'undefined' || self.parent == null) {
    throw new Error(
      `This does not appear to be a child iframe, because there is no parent window.`,
    );
  }

  const {parent} = self;

  const ready = () => parent.postMessage('remote-ui::ready', targetOrigin);

  // Listening to `readyState` in iframe, though the child iframe could probably
  // send a `postMessage` that it is ready to receive messages sooner than that.
  if (document.readyState === 'complete') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        ready();
      }
    });
  }

  // We need to store the listener, because we wrap it to do some origin checking. Ideally,
  // we’d instead store an `AbortController`, and use its signal to cancel the listeners,
  // but that isn’t widely supported.
  const listenerMap = new WeakMap<
    (event: MessageEvent) => void,
    (event: MessageEvent) => void
  >();

  return {
    postMessage(message, transfer) {
      parent.postMessage(message, targetOrigin, transfer);
    },
    addEventListener(event, listener) {
      const wrappedListener = (event: MessageEvent) => {
        if (event.source !== parent) return;
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
  };
}

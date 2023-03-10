import type {MessageEndpoint} from '../types';

import {READY_MESSAGE_KEY} from './constants';

export function fromInsideIframe({targetOrigin = '*'} = {}): MessageEndpoint {
  if (typeof self === 'undefined' || self.parent == null) {
    throw new Error(
      `This does not appear to be a child iframe, because there is no parent window.`,
    );
  }

  // We wait until the document is ready before advertising to the parent that
  // communication can commence.

  // However, it's possible that the parent isn't listening to messages at this time.
  // Which can lead to communication never starting.

  // Therefore we also wait for the parent to send a message once it's ready to (re)send the
  // ready message from within the child iframe.

  const {parent} = self;

  const ready = () => parent.postMessage(READY_MESSAGE_KEY, targetOrigin);

  window.addEventListener('message', (event) => {
    if (event.source !== parent || document.readyState !== 'complete') {
      return;
    }

    if (event.data === READY_MESSAGE_KEY) {
      ready();
    }
  });

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

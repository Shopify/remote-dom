import {retain, createEndpoint} from '@remote-ui/rpc';
import {createRemoteRoot} from '@remote-ui/core';
import {createDocument, createRoot} from '@remote-ui/webcompat';

// This creates the “remote” endpoint — the one that executes inside
// a hidden iframe, and has no access to the DOM of the main page.
// const endpoint = createEndpoint(fromInsideIframe());
const endpoint = createEndpoint(self);

export const document = createDocument();

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  get: () => document,
});

for (let i in document.defaultView) {
  Object.defineProperty(globalThis, i, {
    configurable: true,
    value: document.defaultView[i],
  });
}

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  get: () => self,
});

console.log(document);

// We use `expose()` to provide methods that the other “side” of the
// communication channel can call. Here, we are exposing a single method:
// `render()`, which will be called by the main page when it is ready
// to render our remote UI tree to the page.
endpoint.expose({
  // `receiver` is a function that can be called to update UI on the main
  // page. `createRemoteRoot()` needs that function to communicate updates
  // on the remote tree of UI components.
  //
  // `api` is an object that the main page will pass with additional methods
  // we can call. These methods will be proxied to the main thread, where
  // the actual logic will be executed.
  async render(receiver, api, extensionPoint) {
    // `receiver` is a function, and `api` is an object that has functions.
    // We will be calling both functions at various times in the future (as
    // UI updates happen, and when we call the `api.getMessage()` method).
    // If you ever use a function that was proxied across a `@remote-ui`
    // `Endpoint` object after the function in which you received it, you
    // must manually call the `retain()` method to ensure that the proxy
    // function is not marked for garbage collection.
    retain(receiver);
    retain(api);

    const remoteRoot = createRemoteRoot(receiver);
    const root = createRoot(remoteRoot, document);

    const extension = extensionPoints.get(extensionPoint);
    extension(root, api);
  },
});

const extensionPoints = new Map();

/**
 * @param {string} extensionPoint
 * @param {(root: Element, api: Parameters<import('@remote-ui/rpc').Endpoint<any>['expose']>[0]) => any|Promise<any>} handler
 */
export function extend(extensionPoint, handler) {
  extensionPoints.set(extensionPoint, handler);
}

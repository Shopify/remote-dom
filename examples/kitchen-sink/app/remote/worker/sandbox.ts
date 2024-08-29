import '@remote-dom/core/polyfill';
import '@remote-dom/react/polyfill';
import {retain, createThreadFromWebWorker} from '@quilted/threads';

import {render} from '../render.ts';
import type {SandboxAPI} from '../../types.ts';
import {REMOTE_ID, REMOTE_CONNECTION} from '@remote-dom/core';

// We use the `@quilted/threads` library to create a “thread” for our iframe,
// which lets us communicate over `postMessage` without having to worry about
// most of its complexities.
//
// This block exposes the `render` method that was used by the host application,
// in `index.html`. We receive the `RemoteConnection` object, and start synchronizing
// changes to a `<remote-root>` element that contains our UI.
createThreadFromWebWorker<SandboxAPI>(self as any as Worker, {
  expose: {
    async render(connection, api) {
      // `connection` contains functions that were transferred over `postMessage`.
      // In order to call these functions later, we need to mark them as used in
      // order to prevent garbage collection.
      retain(connection);

      // Similarly, `api.alert` is a function we will call later, so we also need
      // to mark it as used.
      retain(api.alert);

      // We will observe this DOM node, and send any elements within it to be
      // reflected on this "host" page. This element is defined by the Remote DOM
      // library, and provides a convenient `connect()` method that starts
      // synchronizing its children over a `RemoteConnection`.
      if (!customElements.get('remote-root')) {
        class RemoteRoot extends HTMLElement {
          [REMOTE_ID] = '~';
          [REMOTE_CONNECTION] = connection;
        }
        customElements.define('remote-root', RemoteRoot);
      }
      const root = document.createElement('remote-root');
      root.connect?.(connection);

      render(root, api);
    },
  },
});

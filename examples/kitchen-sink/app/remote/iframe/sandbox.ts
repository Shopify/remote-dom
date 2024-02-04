import {RemoteMutationObserver} from '@remote-dom/core/elements';
import {retain, createThreadFromInsideIframe} from '@quilted/threads';

import '../elements.ts';
import {render} from '../render.ts';
import type {SandboxAPI} from '../../types.ts';

// We use the `@quilted/threads` library to create a “thread” for our iframe,
// which lets us communicate over `postMessage` without having to worry about
// most of its complexities.
//
// This block exposes the `render` method that was used by the host application,
// in `index.html`. We receive the `RemoteConnection` object, and start synchronizing
// changes to the `<div id="root">` element that contains our UI.
createThreadFromInsideIframe<SandboxAPI>({
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
      // reflected on this "host" page.
      const root = document.createElement('div');
      root.id = `Example${api.example[0]!.toUpperCase()}${api.example.slice(
        1,
      )}${api.sandbox[0]!.toUpperCase()}${api.sandbox.slice(1)}`;

      document.body.append(root);

      // We use the `RemoteMutationObserver` class, which extends the native DOM
      // `MutationObserver`, to send any changes to a tree of DOM elements over
      // a `RemoteConnection`.
      const observer = new RemoteMutationObserver(connection);
      observer.observe(root);

      render(root, api);
    },
  },
});

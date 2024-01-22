import '@remote-dom/core/polyfill';
import {retain, createThreadFromWebWorker} from '@quilted/threads';

import '../elements.ts';
import {render} from '../render.ts';
import type {SandboxApi} from '../../types.ts';

// This creates the “remote” thread — the one that executes inside
// a web worker, and has no access to the DOM of the main page.
createThreadFromWebWorker<SandboxApi>(self as any as Worker, {
  expose: {
    // `callback` is a function that can be called to update UI on the main
    // page. `()` needs that function to communicate updates
    // on the remote tree of UI components.
    //
    // `api` is an object that the main page will pass with additional methods
    // we can call. These methods will be proxied to the main thread, where
    // the actual logic will be executed.
    async render(callback, api) {
      retain(callback);
      retain(api);

      // We will observe this DOM node, and send any elements within it to be
      // reflected on this "host" page.
      const root = document.createElement('remote-root');
      root.connect(callback);

      render(root, api);
    },
  },
});

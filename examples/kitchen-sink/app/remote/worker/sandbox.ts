import '@remote-dom/core/polyfill';
import {ThreadWebWorker} from '@quilted/threads';

import '../elements.ts';
import {render} from '../render.ts';
import type {SandboxAPI} from '../../types.ts';

// We use the `@quilted/threads` library to create a “thread” for our iframe,
// which lets us communicate over `postMessage` without having to worry about
// most of its complexities.
//
// This block exposes the `render` method that was used by the host application,
// in `index.html`. We receive the `RemoteConnection` object, and start synchronizing
// changes to a `<remote-root>` element that contains our UI.
new ThreadWebWorker<never, SandboxAPI>(self as any as Worker, {
  exports: {
    async render(connection, api) {
      // We will observe this DOM node, and send any elements within it to be
      // reflected on this "host" page. This element is defined by the Remote DOM
      // library, and provides a convenient `connect()` method that starts
      // synchronizing its children over a `RemoteConnection`.
      const root = document.createElement('remote-root');
      root.connect(connection);
      document.body.append(root);

      await render(root, api);
    },
  },
});

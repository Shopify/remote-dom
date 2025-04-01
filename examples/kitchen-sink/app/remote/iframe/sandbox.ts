import {RemoteMutationObserver} from '@remote-dom/core/elements';
import {ThreadNestedIframe} from '@quilted/threads';
import {createEndpoint, fromInsideIframe, retain} from '@remote-ui/rpc';

import '../elements.ts';
import {render, renderLegacy} from '../render.ts';
import type {SandboxAPI} from '../../types.ts';

// We use the `@quilted/threads` library to create a “thread” for our iframe,
// which lets us communicate over `postMessage` without having to worry about
// most of its complexities.
//
// This block exposes the `render` method that was used by the host application,
// in `index.html`. We receive the `RemoteConnection` object, and start synchronizing
// changes to the `<div id="root">` element that contains our UI.
createEndpoint(fromInsideIframe()).expose({
  async render(connection, api) {
    retain(connection);
    retain(api);

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

    await render(root, api);
  },
  async renderLegacy(channel, api) {
    retain(channel);
    retain(api);

    await renderLegacy(channel, api);
  },
});

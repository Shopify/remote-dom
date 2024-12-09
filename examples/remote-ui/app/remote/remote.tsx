/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {createEndpoint, fromInsideIframe, retain} from '@remote-ui/rpc';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

import * as components from './components';
import {App} from './app';
import {EndpointApi} from '../types';

const endpoint = createEndpoint<EndpointApi>(fromInsideIframe());

endpoint.expose({
  render(channel, api) {
    retain(channel);
    retain(api);

    const remoteRoot = createRemoteRoot(channel, {
      components: Object.keys(components),
    });

    createRoot(remoteRoot).render(<App api={api} />);
    remoteRoot.mount();
  },
});

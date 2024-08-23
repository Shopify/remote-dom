import {retain, createEndpoint} from '@remote-ui/rpc';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

import {RemoteApp} from './app';
import type {Endpoint} from '../types';

const endpoint = createEndpoint<Endpoint>(self, {callable: ['render']});
endpoint.expose({
  async render(receiver, api) {
    retain(receiver);
    retain(api);
    const remoteRoot = createRemoteRoot(receiver, {components: ['Button']});
    const root = createRoot(remoteRoot);
    root.render(
      <RemoteApp
        {...api}
        destroy={() => {
          root.unmount();
        }}
      />,
    );
    await remoteRoot.mount();
  },
});

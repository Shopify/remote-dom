import {retain, createEndpoint} from '@remote-ui/rpc';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

import {RemoteApp} from './app';
import type {Endpoint} from '../types';

const endpoint = createEndpoint<Endpoint>(self, {callable: ['render']});
endpoint.expose({
  async render(receiver, api) {
    retain(receiver);
    retain(api);
    const remoteRoot = createRemoteRoot(receiver, {
      components: ['Button', 'File'],
    });
    const root = createRoot(remoteRoot);
    root.render(<RemoteApp {...api} />);
    await remoteRoot.mount();
  },
});

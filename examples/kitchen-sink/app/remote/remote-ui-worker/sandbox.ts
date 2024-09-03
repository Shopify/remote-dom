import {retain, createEndpoint, fromWebWorker} from '@remote-ui/rpc';
import {createRemoteRoot} from '@remote-ui/core';

import {renderVanilla} from './example-vanilla.ts';
import {renderReact} from './example-react.tsx';
import type {LegacySandboxAPI} from '../../types.ts';

createEndpoint<LegacySandboxAPI>(fromWebWorker(self as any as Worker)).expose({
  async render(connection, api) {
    retain(connection);
    retain(api, {deep: true});

    const root = createRemoteRoot(connection);
    switch (api.example) {
      case 'react':
        renderReact(root, api);
        break;
      case 'vanilla':
        renderVanilla(root, api);
        break;
      default:
        root.append(
          root.createText(
            `🚫 There is no remote-ui legacy version of the "${api.example}" example.`,
          ),
        );
    }
    root.mount();
  },
});

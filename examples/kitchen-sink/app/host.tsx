import '@preact/signals';
import {render} from 'preact';
import {
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  createRemoteComponentRenderer,
  SignalRemoteReceiver,
} from '@remote-dom/preact/host';

import {createEndpoint, fromWebWorker, retain, release} from '@remote-ui/rpc';

import {Button, Stack, Text} from './host/components.tsx';
import {adaptToLegacyRemoteChannel} from '@remote-dom/compat';

const uiRoot = document.querySelector('main')!;

const worker = new Worker(
  new URL('./remote/worker/sandbox.ts', import.meta.url),
  {
    type: 'module',
  },
);

interface RemoteAPI {
  renderLegacy: (channel: any) => Promise<void>;
}

const endpoint = createEndpoint<RemoteAPI>(fromWebWorker(worker));

const components = new Map([
  ['ui-text', createRemoteComponentRenderer(Text)],
  ['ui-button', createRemoteComponentRenderer(Button)],
  ['ui-stack', createRemoteComponentRenderer(Stack)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

const receiver = new SignalRemoteReceiver({retain, release});
const channel = adaptToLegacyRemoteChannel(receiver.connection, {
  elements: {
    Text: 'ui-text',
    Button: 'ui-button',
    Stack: 'ui-stack',
  },
});
endpoint.call.renderLegacy(channel);

render(
  <>
    <ExampleRenderer />
  </>,
  uiRoot,
);

function ExampleRenderer() {
  return (
    <div>
      <RemoteRootRenderer receiver={receiver} components={components} />
    </div>
  );
}

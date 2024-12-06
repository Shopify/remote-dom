import {render} from 'preact';
import '@preact/signals';

import {
  SignalRemoteReceiver,
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  createRemoteComponentRenderer,
} from '@remote-dom/preact/host';
import {adaptToLegacyRemoteChannel} from '@remote-dom/core/legacy';
import {createEndpoint, fromIframe, retain, release} from '@remote-ui/rpc';
import {Button, Modal, Stack, Text} from './components.tsx';

const components = new Map([
  ['Text', createRemoteComponentRenderer(Text)],
  ['Button', createRemoteComponentRenderer(Button)],
  ['Stack', createRemoteComponentRenderer(Stack)],
  ['Modal', createRemoteComponentRenderer(Modal)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

const root = document.querySelector('#root')!;
const iframe = document.querySelector('#remote-iframe') as HTMLIFrameElement;
const endpoint = createEndpoint(fromIframe(iframe));

const receiver = new SignalRemoteReceiver({retain, release});
const channel = adaptToLegacyRemoteChannel(receiver.connection);

render(
  <RemoteRootRenderer components={components} receiver={receiver} />,
  root,
);

endpoint.call.render(channel, {
  showAlert: (message: string) => {
    alert(message);
  },
});

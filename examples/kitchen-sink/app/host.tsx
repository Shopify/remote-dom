import {render} from 'preact';
import {
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  SignalRemoteReceiver,
  createRemoteComponentRenderer,
} from '@remote-dom/preact/host';
import {
  retain,
  release,
  createThreadFromIframe,
  createThreadFromWebWorker,
} from '@quilted/threads';
import '@preact/signals';

import type {SandboxAPI} from './types.ts';
import {Button, Modal, Stack, Text, TextField} from './host/components.tsx';

const uiRoot = document.querySelector('#root')!;
const iframe = document.querySelector('iframe')!;

const worker = new Worker(
  new URL('./remote/worker/sandbox.ts', import.meta.url),
  {
    type: 'module',
  },
);

// This creates an object that represents the remote context — in this case,
// some JavaScript executing inside an `iframe`. We can use this object
// to interact with the `iframe` code without having to worry about using
// `postMessage()`.
// @ts-ignore We don’t use this variable, but we want to give it a name for clarity.
const iframeSandbox = createThreadFromIframe<never, SandboxAPI>(iframe);

const workerSandbox = createThreadFromWebWorker<never, SandboxAPI>(worker);

// This object will receive messages about UI updates from the remote context
// and turn them into a matching tree of DOM nodes. We provide a mapping of
// the components that are available in the remote context (in this case, only
// `Button`), and the element to use when the remote context asks to render
// that component (in this case, our `ui-button` custom element).
const receiver = new SignalRemoteReceiver({retain, release});

// TODO
const components = new Map([
  ['ui-text', createRemoteComponentRenderer(Text)],
  ['ui-button', createRemoteComponentRenderer(Button)],
  ['ui-stack', createRemoteComponentRenderer(Stack)],
  ['ui-modal', createRemoteComponentRenderer(Modal)],
  ['ui-text-field', createRemoteComponentRenderer(TextField)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

render(
  <RemoteRootRenderer receiver={receiver} components={components} />,
  uiRoot,
);

// Here, we are using the `Endpoint` API to call a method that was “exposed”
// in the remote context. As you’ll see in `./remote.js`, that JavaScript
// provides a `render()` function that will be called in response to this
// method, with the `Endpoint` taking care of serializing arguments over
// `postMessage()` to the remote context.
await workerSandbox.render(receiver.connection, {
  sandbox: 'worker',
  example: 'preact',
  async alert(content) {
    window.alert(content);
  },
});

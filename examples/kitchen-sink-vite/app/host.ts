import {DOMRemoteReceiver} from '@remote-dom/core/receiver';
import {
  retain,
  release,
  createThreadFromIframe,
  createThreadFromWebWorker,
} from '@quilted/threads';

import {UiButton, UiStack, UiTextField} from './components.ts';
import type {SandboxApi} from './types.ts';

// We register a few custom elements that will be rendered by our
// application — `UiButton` will be available for the remote context to
// render, and `UiTextField` is used on the main page to render an input
// that is not managed by the remote context.
customElements.define(UiButton.name, UiButton);
customElements.define(UiStack.name, UiStack);
customElements.define(UiTextField.name, UiTextField);

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
const iframeSandbox = createThreadFromIframe<never, SandboxApi>(iframe);

const workerSandbox = createThreadFromWebWorker<never, SandboxApi>(worker);

// This object will receive messages about UI updates from the remote context
// and turn them into a matching tree of DOM nodes. We provide a mapping of
// the components that are available in the remote context (in this case, only
// `Button`), and the element to use when the remote context asks to render
// that component (in this case, our `ui-button` custom element).
const receiver = new DOMRemoteReceiver({retain, release});

// This instructs the receiver to render any UI for the remote context
// in our (initially empty) wrapper element.
receiver.connect(uiRoot);

// Here, we are using the `Endpoint` API to call a method that was “exposed”
// in the remote context. As you’ll see in `./remote.js`, that JavaScript
// provides a `render()` function that will be called in response to this
// method, with the `Endpoint` taking care of serializing arguments over
// `postMessage()` to the remote context.
await workerSandbox.render(receiver.receive, {
  sandbox: 'worker',
  framework: 'htm',
  async alert(content) {
    window.alert(content);
  },
});

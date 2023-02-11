import {DomReceiver} from 'https://cdn.skypack.dev/@remote-ui/dom';
import {
  createEndpoint,
  fromIframe,
} from 'https://cdn.skypack.dev/@remote-ui/rpc';

import {UiButton, UiTextField} from './components.js';

// We register a few custom elements that will be rendered by our
// application — `UiButton` will be available for the remote context to
// render, and `UiTextField` is used on the main page to render an input
// that is not managed by the remote context.
customElements.define(UiButton.name, UiButton);
customElements.define(UiTextField.name, UiTextField);

const uiRoot = document.querySelector('#root');
const textField = document.querySelector(UiTextField.name);

/*
We use an iframe as the remote environment here, because it supports
modules in most modern browsers. Aside from support for ES modules, there
is nothing that prevents us from instead using a web worker as the remote
environment. Note that, without using a separate domain, or manually
hiding globals within the iframe, we are not actually creating a “safe”
sandbox here, as the remote code can reach up into the parent.
*/
const remoteIframe = Object.assign(document.createElement('iframe'), {
  src: './remote.html',
  sandbox: 'allow-same-origin allow-scripts',
  style: 'visibility: hidden; position: absolute',
});

// This creates an object that represents the remote context — in this case,
// some JavaScript executing inside an `iframe`. We can use this object
// to interact with the `iframe` code without having to worry about using
// `postMessage()`.
const remoteEndpoint = createEndpoint(fromIframe(remoteIframe));
document.body.appendChild(remoteIframe);

// This object will receive messages about UI updates from the remote context
// and turn them into a matching tree of DOM nodes. We provide a mapping of
// the components that are available in the remote context (in this case, only
// `Button`), and the element to use when the remote context asks to render
// that component (in this case, our `ui-button` custom element).
const receiver = new DomReceiver({
  customElement: {
    Button: UiButton.name,
  },
});

// This instructs the receiver to render any UI for the remote context
// in our (initially empty) wrapper element.
receiver.bind(uiRoot);

// Here, we are using the `Endpoint` API to call a method that was “exposed”
// in the remote context. As you’ll see in `./remote.js`, that JavaScript
// provides a `render()` function that will be called in response to this
// method, with the `Endpoint` taking care of serializing arguments over
// `postMessage()` to the remote context.
await remoteEndpoint.call.render(receiver.receive, {
  getMessage: () => textField.value,
});

import {DomReceiver} from '@remote-ui/dom';
import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';

import {
  UiBlockLayout,
  UiBlockStack,
  UiInlineStack,
  UiStack,
  UiStackItem,
  UiButton,
  UiTextField,
  UiTextBlock,
  UiText,
  UiView,
} from './components.js';

const availableComponents = [
  UiBlockLayout,
  UiBlockStack,
  UiInlineStack,
  UiStack,
  UiStackItem,
  UiButton,
  UiTextField,
  UiTextBlock,
  UiText,
  UiView,
];

// We register a few custom elements that will be rendered by our
// application — `UiButton` will be available for the remote context to
// render, and `UiTextField` is used on the main page to render an input
// that is not managed by the remote context.
for (const Component of availableComponents) {
  customElements.define(Component.name, Component);
}

const componentMapping = availableComponents.reduce((map, element) => {
  const name = element.name;
  map[name] = name;
  map[name.replace(/^ui-/, '')] = name;
  return map;
}, {});

const messageField = document.getElementById('message');

async function renderExtension(extensionPoint, parent) {
  const root = document.createElement('div');
  root.setAttribute('data-extension', extensionPoint);
  parent.appendChild(root);

  // const sandboxFrame = document.createElement('iframe');
  // sandboxFrame.style.cssText = 'visibility: hidden; position: absolute';
  // sandboxFrame.setAttribute('data-extension', extensionPoint);
  // sandboxFrame.setAttribute('sandbox', 'allow-scripts');
  // sandboxFrame.src = './remote.html';
  // document.body.appendChild(sandboxFrame);

  // prettier-ignore
  const worker = new Worker(
    new URL('./extension-points/index.js', import.meta.url),
    {type: 'module'} // https://github.com/vitejs/vite/issues/10206
  );

  // This creates an object that represents the remote context — in this case,
  // some JavaScript executing inside an `iframe`. We can use this object
  // to interact with the `iframe` code without having to worry about using
  // `postMessage()`.
  // const remoteEndpoint = createEndpoint(fromIframe(sandboxFrame));
  const remoteEndpoint = createEndpoint(fromWebWorker(worker));

  // This object will receive messages about UI updates from the remote context
  // and turn them into a matching tree of DOM nodes. We provide a mapping of
  // the components that are available in the remote context (in this case, only
  // `Button`), and the element to use when the remote context asks to render
  // that component (in this case, our `ui-button` custom element).
  const receiver = new DomReceiver({
    customElement: componentMapping,
  });

  // This instructs the receiver to render any UI for the remote context
  // in our (initially empty) wrapper element.
  receiver.bind(root);

  const api = {
    getMessage: () => messageField.value,
  };

  // Here, we are using the `Endpoint` API to call a method that was “exposed”
  // in the remote context. As you’ll see in `./remote.js`, that JavaScript
  // provides a `render()` function that will be called in response to this
  // method, with the `Endpoint` taking care of serializing arguments over
  // `postMessage()` to the remote context.
  await remoteEndpoint.call.render(receiver.receive, api, extensionPoint);
}

const root = document.getElementById('root');

{
  const section = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = 'Vanilla DOM';
  section.append(title);
  root?.append(section);
  renderExtension('dom', section);
}

{
  const section = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = 'Preact';
  section.append(title);
  root?.append(section);
  renderExtension('preact', section);
}

{
  const section = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = 'Vue';
  section.append(title);
  root?.append(section);
  renderExtension('vue', section);
}

{
  const section = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = 'REPL';
  section.append(title);
  root?.append(section);
  renderExtension('repl', section);
}

import {render} from 'preact';
import {
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  createRemoteComponentRenderer,
} from '@remote-dom/preact/host';
import {ThreadIframe, ThreadWebWorker} from '@quilted/threads';

import type {SandboxAPI} from './types.ts';
import {Button, Modal, Stack, Text, ControlPanel} from './host/components.tsx';
import {createState} from './host/state.ts';

// We will put any remote elements we want to render in this root element.
const uiRoot = document.querySelector('main')!;

// We use the `@quilted/threads` library to create a “thread” for our iframe,
// which lets us communicate over `postMessage` without having to worry about
// most of its complexities.
const iframe = document.querySelector('iframe')!;
const iframeSandbox = new ThreadIframe<SandboxAPI>(iframe);

// We also use the `@quilted/threads` library to create a “thread” around a Web
// Worker. We’ll run the same example code in both, depending on the `sandbox`
// state chosen by the user.
const worker = new Worker(
  new URL('./remote/worker/sandbox.ts', import.meta.url),
  {
    type: 'module',
  },
);
const workerSandbox = new ThreadWebWorker<SandboxAPI>(worker);

// We will use Preact to render remote elements in this example. The Preact
// helper library lets you do this by mapping the name of a remote element to
// a local Preact component. We’ve implemented the actual UI of our components in
// the `./host/components.tsx` file, but we need to wrap each one in the `createRemoteComponentRenderer()`
// helper function in order to get some Preact niceties, like automatic conversion
// of slots to element props, and using the instance of a Preact component as the
// target for methods called on matching remote elements.
const components = new Map([
  ['ui-text', createRemoteComponentRenderer(Text)],
  ['ui-button', createRemoteComponentRenderer(Button)],
  ['ui-stack', createRemoteComponentRenderer(Stack)],
  ['ui-modal', createRemoteComponentRenderer(Modal)],
  // The `remote-fragment` element is a special element created by Remote DOM when
  // it needs an unstyled container for a list of elements. This is primarily used
  // to convert elements passed as a prop to React or Preact components into a slotted
  // element. The `RemoteFragmentRenderer` component is provided to render this element
  // on the host.
  ['remote-fragment', RemoteFragmentRenderer],
]);

// We offload most of the complex state logic to this `createState()` function. We’re
// just leaving the key bit in this file: when the example or sandbox changes, we render
// the example in the chosen sandbox. The `createState()` passes us a fresh `receiver`
// each time. This object, a `SignalRemoteReceiver`, keeps track of the tree of elements
// rendered by the remote environment. We use this object later to render these trees
// to Preact components using the `RemoteRootRenderer` component.

const {receiver, example, sandbox} = createState(
  async ({receiver, example, sandbox}) => {
    if (sandbox === 'iframe') {
      await iframeSandbox.imports.render(receiver.connection, {
        sandbox,
        example,
        async alert(content) {
          console.log(
            `Alert API used by example ${example} in the iframe sandbox`,
          );
          window.alert(content);
        },
      });
    } else {
      await workerSandbox.imports.render(receiver.connection, {
        sandbox,
        example,
        async alert(content) {
          console.log(
            `Alert API used by example ${example} in the worker sandbox`,
          );
          window.alert(content);
        },
      });
    }
  },
);

// We render our Preact application, including the part that renders any remote
// elements for the current example, and the control panel that lets us change
// the framework or JavaScript sandbox being used.
render(
  <>
    <ExampleRenderer />
    <ControlPanel sandbox={sandbox} example={example} />
  </>,
  uiRoot,
);

function ExampleRenderer() {
  const value = receiver.value;

  if (value == null) return <div>Loading...</div>;

  if ('then' in value) {
    return <div>Rendering example...</div>;
  }

  if (value instanceof Error) {
    return <div>Error while rendering example: {value.message}</div>;
  }

  return (
    <div>
      <RemoteRootRenderer receiver={value} components={components} />
    </div>
  );
}

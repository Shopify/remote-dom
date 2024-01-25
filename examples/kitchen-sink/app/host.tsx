import {render, type ComponentChildren} from 'preact';
import {useRef, useState} from 'preact/hooks';
import {
  RemoteRootRenderer,
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

import type {
  SandboxAPI,
  ButtonProperties,
  StackProperties,
  TextFieldProperties,
} from './types.ts';

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
  ['ui-button', createRemoteComponentRenderer(Button)],
  ['ui-stack', createRemoteComponentRenderer(Stack)],
  ['ui-text-field', createRemoteComponentRenderer(TextField)],
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
  example: 'vue',
  async alert(content) {
    window.alert(content);
  },
});

// Components

export function Button({
  onPress,
  children,
}: {children?: ComponentChildren} & ButtonProperties) {
  return (
    <button class="Button" type="button" onClick={() => onPress?.()}>
      {children}
    </button>
  );
}

export function Stack({
  spacing,
  children,
}: {children?: ComponentChildren} & StackProperties) {
  return (
    <div
      class={['Stack', spacing && 'Stack--spacing'].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export function TextField({
  label,
  value: initialValue = '',
  onChange,
}: TextFieldProperties) {
  const [value, setValue] = useState(initialValue);
  const id = useId();

  return (
    <div class="TextField">
      <label class="Label" for={id}>
        {label}
      </label>
      <div class="InputContainer">
        <input
          id={id}
          class="Input"
          type="text"
          onChange={(event) => {
            setValue(event.currentTarget.value);
            onChange?.(event.currentTarget.value);
          }}
          value={value}
        ></input>
        <div class="InputBackdrop"></div>
      </div>
    </div>
  );
}

function useId() {
  const ref = useRef<string>();
  return (ref.current ??= nanoId());
}

// @see https://github.com/ai/nanoid/blob/main/non-secure/index.js

function nanoId(size = 21) {
  // This alphabet uses `A-Za-z0-9_-` symbols. The genetic algorithm helped
  // optimize the gzip compression for this alphabet.
  const urlAlphabet =
    'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';

  let id = '';
  // A compact alternative for `for (var i = 0; i < step; i++)`.
  let i = size;
  while (i--) {
    // `| 0` is more compact and faster than `Math.floor()`.
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}

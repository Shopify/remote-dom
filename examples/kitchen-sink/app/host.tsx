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
import {signal, effect} from '@preact/signals';

import {
  RenderAPI,
  RenderExample,
  RenderSandbox,
  type SandboxAPI,
} from './types.ts';
import {Button, Modal, Stack, Text, ControlPanel} from './host/components.tsx';

const uiRoot = document.querySelector('main')!;

const iframe = document.querySelector('iframe')!;
const iframeSandbox = createThreadFromIframe<never, SandboxAPI>(iframe);

const worker = new Worker(
  new URL('./remote/worker/sandbox.ts', import.meta.url),
  {
    type: 'module',
  },
);
const workerSandbox = createThreadFromWebWorker<never, SandboxAPI>(worker);

const initialURL = new URL(window.location.href);

const defaultSandbox = 'worker';
const allowedSandboxValues = new Set<RenderSandbox>(['iframe', 'worker']);
const sandboxQueryParam = initialURL.searchParams
  .get('sandbox')
  ?.toLowerCase() as RenderSandbox | undefined;
const sandbox = signal<RenderSandbox>(
  allowedSandboxValues.has(sandboxQueryParam!)
    ? sandboxQueryParam!
    : defaultSandbox,
);

const defaultExample = 'vanilla';
const allowedExampleValues = new Set<RenderExample>([
  'vanilla',
  'htm',
  'preact',
  'react',
  'svelte',
  'vue',
]);
const exampleQueryParam = initialURL.searchParams
  .get('example')
  ?.toLowerCase() as RenderExample | undefined;
const example = signal<RenderExample>(
  allowedExampleValues.has(exampleQueryParam!)
    ? exampleQueryParam!
    : defaultExample,
);

const receiver = signal<
  SignalRemoteReceiver | Error | Promise<SignalRemoteReceiver> | undefined
>(undefined);

const components = new Map([
  ['ui-text', createRemoteComponentRenderer(Text)],
  ['ui-button', createRemoteComponentRenderer(Button)],
  ['ui-stack', createRemoteComponentRenderer(Stack)],
  ['ui-modal', createRemoteComponentRenderer(Modal)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

render(
  <>
    <ExampleRenderer />
    <ControlPanel sandbox={sandbox} example={example} />
  </>,
  uiRoot,
);

function ExampleRenderer() {
  const value = receiver.value;

  if (value == null || 'then' in value) {
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

const exampleCache = new Map<
  string,
  SignalRemoteReceiver | Error | Promise<SignalRemoteReceiver>
>();

effect(() => {
  const sandboxValue = sandbox.value;
  const exampleValue = example.value;

  const key = `${sandboxValue}:${exampleValue}`;
  let cached = exampleCache.get(key);

  const newURL = new URL(window.location.href);

  if (sandboxValue === defaultSandbox && exampleValue === defaultExample) {
    newURL.searchParams.delete('sandbox');
    newURL.searchParams.delete('example');
  } else {
    newURL.searchParams.set('sandbox', sandboxValue);
    newURL.searchParams.set('example', exampleValue);
  }

  window.history.replaceState({}, '', newURL.toString());

  if (cached == null) {
    cached = renderWithOptions({sandbox: sandboxValue, example: exampleValue});
    exampleCache.set(key, cached);
  }

  if (typeof (cached as any).then === 'function') {
    Promise.resolve()
      .then(() => cached!)
      .then((receiver) => updateValueAfterRender(receiver))
      .catch((error) => updateValueAfterRender(error));
  }

  receiver.value = cached;

  function updateValueAfterRender(value: SignalRemoteReceiver | Error) {
    exampleCache.set(key, value);

    if (sandboxValue !== sandbox.peek() || exampleValue !== example.peek()) {
      return value;
    }

    receiver.value = value;

    return value;
  }
});

async function renderWithOptions({
  example,
  sandbox,
}: Pick<RenderAPI, 'example' | 'sandbox'>) {
  const receiver = new SignalRemoteReceiver({retain, release});

  if (sandbox === 'iframe') {
    await iframeSandbox.render(receiver.connection, {
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
    await workerSandbox.render(receiver.connection, {
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

  return receiver;
}

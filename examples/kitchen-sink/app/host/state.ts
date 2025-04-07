import {effect, signal} from '@preact/signals';
import {SignalRemoteReceiver} from '@remote-dom/preact/host';

import type {RenderExample, RenderSandbox} from '../types.ts';

const DEFAULT_SANDBOX = 'worker';
const ALLOWED_SANDBOX_VALUES = new Set<RenderSandbox>(['iframe', 'worker']);

const DEFAULT_EXAMPLE = 'vanilla';
const ALLOWED_EXAMPLE_VALUES = new Set<RenderExample>([
  'vanilla',
  'htm',
  'preact',
  'react',
  'react-mutations',
  'svelte',
  'vue',
  'react-mutations-1',
  'react-mutations-2',
  'react-mutations-3',
]);

export function createState(
  render: (details: {
    example: RenderExample;
    sandbox: RenderSandbox;
    receiver: SignalRemoteReceiver;
  }) => void | Promise<void>,
) {
  const initialURL = new URL(window.location.href);

  const sandboxQueryParam = initialURL.searchParams
    .get('sandbox')
    ?.toLowerCase() as RenderSandbox | undefined;

  const sandbox = signal<RenderSandbox>(
    ALLOWED_SANDBOX_VALUES.has(sandboxQueryParam!)
      ? sandboxQueryParam!
      : DEFAULT_SANDBOX,
  );

  const exampleQueryParam = initialURL.searchParams
    .get('example')
    ?.toLowerCase() as RenderExample | undefined;

  const example = signal<RenderExample>(
    ALLOWED_EXAMPLE_VALUES.has(exampleQueryParam!)
      ? exampleQueryParam!
      : DEFAULT_EXAMPLE,
  );

  const receiver = signal<
    SignalRemoteReceiver | Error | Promise<SignalRemoteReceiver> | undefined
  >(undefined);

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

    if (sandboxValue === DEFAULT_SANDBOX && exampleValue === DEFAULT_EXAMPLE) {
      newURL.searchParams.delete('sandbox');
      newURL.searchParams.delete('example');
    } else {
      newURL.searchParams.set('sandbox', sandboxValue);
      newURL.searchParams.set('example', exampleValue);
    }

    window.history.replaceState({}, '', newURL.toString());

    if (cached == null) {
      const receiver = new SignalRemoteReceiver();
      cached = Promise.resolve(
        render({
          receiver,
          sandbox: sandboxValue,
          example: exampleValue,
        }),
      )
        .then(() => {
          updateValueAfterRender(receiver);
          return receiver;
        })
        .catch((error) => {
          updateValueAfterRender(error);
          return Promise.reject(error);
        });

      exampleCache.set(key, cached);
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

  return {receiver, sandbox, example};
}

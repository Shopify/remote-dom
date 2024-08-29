import {signal, effect} from '@preact/signals';
import {retain, release} from '@quilted/threads';
import {PreactTreeReceiver} from '@remote-dom/tree-receiver/preact';

import type {RenderExample, RenderSandbox} from '../types.ts';
import {ComponentType} from 'preact';

const DEFAULT_SANDBOX = 'worker';
const ALLOWED_SANDBOX_VALUES = new Set<RenderSandbox>(['iframe', 'worker']);

const DEFAULT_EXAMPLE = 'vanilla';
const ALLOWED_EXAMPLE_VALUES = new Set<RenderExample>([
  'vanilla',
  'htm',
  'preact',
  'react',
  'react-dom',
  'svelte',
  'vue',
]);

export function createState(
  render: (details: {
    example: RenderExample;
    sandbox: RenderSandbox;
    receiver: PreactTreeReceiver;
  }) => void | Promise<void>,
  components: Map<string, ComponentType>,
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
    PreactTreeReceiver | Error | Promise<PreactTreeReceiver> | undefined
  >(undefined);

  const tree = signal<JSX.Element>();

  effect(() => {
    const {value} = receiver;
    if (!value || value instanceof Error || value instanceof Promise) return;
    tree.value = value.resolved();
    value.rerender = (jsx) => (tree.value = jsx);
    return () => (value.rerender = Object);
  });

  const exampleCache = new Map<
    string,
    PreactTreeReceiver | Error | Promise<PreactTreeReceiver>
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
      const receiver = new PreactTreeReceiver({
        retain,
        release,
        components,
        rerender() {},
      });
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

    function updateValueAfterRender(value: PreactTreeReceiver | Error) {
      exampleCache.set(key, value);

      if (sandboxValue !== sandbox.peek() || exampleValue !== example.peek()) {
        return value;
      }

      receiver.value = value;

      return value;
    }
  });

  return {receiver, tree, sandbox, example};
}

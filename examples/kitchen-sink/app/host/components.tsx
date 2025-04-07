import type {Signal} from '@preact/signals';
import {type ComponentChildren} from 'preact';
import {forwardRef} from 'preact/compat';
import {useImperativeHandle, useRef} from 'preact/hooks';

import type {
  ButtonProperties,
  ModalMethods,
  ModalProperties,
  RenderExample,
  RenderSandbox,
  StackProperties,
  TextProperties,
} from '../types.ts';

export function Text({
  emphasis,
  children,
}: {children?: ComponentChildren} & TextProperties) {
  return (
    <span
      class={['Text', emphasis && 'Text--emphasis'].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}

export function Button({
  onPress,
  modal,
  children,
}: {
  children?: ComponentChildren;
  modal?: ComponentChildren;
} & ButtonProperties) {
  return (
    <>
      <button
        class="Button"
        type="button"
        onClick={() =>
          onPress?.() ?? document.querySelector('dialog')?.showModal()
        }
      >
        {children}
      </button>
      {modal}
    </>
  );
}

export function Stack({
  testId,
  spacing,
  children,
}: {children?: ComponentChildren} & StackProperties) {
  return (
    <div
      data-testid={testId}
      class={['Stack', spacing && 'Stack--spacing'].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export const Modal = forwardRef<
  ModalMethods,
  {
    children?: ComponentChildren;
    primaryAction?: ComponentChildren;
  } & ModalProperties
>(function Modal({children, primaryAction, onClose}, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open() {
      dialogRef.current?.showModal();
    },
    close() {
      dialogRef.current?.close();
    },
  }));

  return (
    <dialog ref={dialogRef} class="Modal" onClose={() => onClose?.()}>
      <div class="Modal-Content">{children}</div>
      {primaryAction && <div class="Modal-Actions">{primaryAction}</div>}
    </dialog>
  );
});

function Select({
  id: explicitID,
  label,
  labelVisibility,
  value,
  children,
}: {
  id?: string;
  label: string;
  labelVisibility?: 'visible' | 'hidden';
  value: Signal<string>;
} & {
  children: ComponentChildren;
}) {
  const id = useID(explicitID);

  return (
    <div class="Select">
      <label
        class={[
          'Label',
          labelVisibility === 'hidden' && 'Label--visually-hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        for={id}
      >
        {label}
      </label>
      <select
        id={id}
        class="Select-Input"
        value={value.value}
        onChange={({currentTarget}) => {
          value.value = currentTarget.value;
        }}
      >
        {children}
      </select>
    </div>
  );
}

export function ControlPanel({
  sandbox,
  example,
}: {
  sandbox: Signal<RenderSandbox>;
  example: Signal<RenderExample>;
}) {
  return (
    <div class="ControlPanel">
      <section class="ControlPanel-Section">
        <h2 class="ControlPanel-SectionHeading">Example</h2>
        <p class="ControlPanel-SectionDescription">
          Which example should we render in the sandbox? You can read the source
          code for the example in <ExampleCodeReference example={example} />
        </p>
        <Select
          id="ControlPanelExample"
          value={example}
          label="Example"
          labelVisibility="hidden"
        >
          <option value="vanilla">“Vanilla” DOM</option>
          <option value="preact">Preact</option>
          <option value="react">React</option>
          <option value="svelte">Svelte</option>
          <option value="vue">Vue</option>
          <option value="htm">htm</option>
          <option value="react-remote-ui">React Remote UI</option>
          <option value="react-mutations-1">React Mutations 1</option>
          <option value="react-mutations-2">React Mutations 2</option>
          <option value="react-mutations-3">React Mutations 3</option>
        </Select>
      </section>

      <section class="ControlPanel-Section">
        <h2 class="ControlPanel-SectionHeading">Sandbox</h2>
        <p class="ControlPanel-SectionDescription">
          What browser technology should we use to sandbox the example? Remote
          DOM supports being sandboxed in <code>&lt;iframe&gt;</code>s and{' '}
          <a
            class="Link"
            href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API"
          >
            Web Workers
          </a>
        </p>
        <Select
          id="ControlPanelSandbox"
          value={sandbox}
          label="Sandbox"
          labelVisibility="hidden"
        >
          <option value="worker">Web Worker</option>
          <option value="iframe">iFrame</option>
        </Select>
      </section>
    </div>
  );
}

const EXAMPLE_FILE_NAMES = new Map<RenderExample, string>([
  ['vanilla', 'vanilla.ts'],
  ['htm', 'htm.ts'],
  ['preact', 'preact.tsx'],
  ['react', 'react.tsx'],
  ['react-mutations-1', 'react-mutations.tsx'],
  ['react-mutations-2', 'react-mutations.tsx'],
  ['react-mutations-3', 'react-mutations.tsx'],
  ['svelte', 'App.svelte'],
  ['vue', 'App.vue'],
]);

function ExampleCodeReference({example}: {example: Signal<RenderExample>}) {
  const value = example.value;

  return <code>app/remote/examples/{EXAMPLE_FILE_NAMES.get(value)}</code>;
}

// Helpers

function useID(id?: string) {
  const ref = useRef<string>();

  if (id) {
    ref.current = id;
    return id;
  }

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

import {type ComponentChildren} from 'preact';
import {useRef, useState, useImperativeHandle} from 'preact/hooks';
import {forwardRef} from 'preact/compat';

import type {
  ButtonProperties,
  StackProperties,
  TextFieldProperties,
  TextProperties,
  ModalMethods,
  ModalProperties,
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
      <div class="Modal__Content">{children}</div>
      {primaryAction && <div class="Modal__Actions">{primaryAction}</div>}
    </dialog>
  );
});

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

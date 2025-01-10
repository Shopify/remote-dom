import {type ComponentChildren} from 'preact';
import {forwardRef} from 'preact/compat';

import type {
  ButtonProperties,
  StackProperties,
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
        onClick={() => {
          if (onPress) {
            onPress();
          } else {
            document.querySelector('dialog')?.showModal();
          }
        }}
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
>(function Modal({children, primaryAction, onClose}) {
  return (
    <dialog
      class="Modal"
      onClose={() => {
        onClose?.();
      }}
    >
      <div class="Modal-Content">{children}</div>
      {primaryAction && <div class="Modal-Actions">{primaryAction}</div>}
    </dialog>
  );
});

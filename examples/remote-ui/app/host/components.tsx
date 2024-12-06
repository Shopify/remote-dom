import {type ComponentChildren} from 'preact';
import {forwardRef} from 'preact/compat';
import {
  useRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
} from 'preact/hooks';
import {createContext, useContext} from 'preact/compat';

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
          onPress?.();
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
>(function Modal({children, primaryAction}) {
  return (
    <div class="Modal">
      <div class="Modal-Content">{children}</div>
      {primaryAction && <div class="Modal-Actions">{primaryAction}</div>}
    </div>
  );
});

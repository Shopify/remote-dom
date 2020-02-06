import {
  useState,
  useRef,
  useCallback,
  MutableRefObject,
  useContext,
} from 'react';

import {ControllerContext, RemoteReceiverContext} from './context';

export function useController() {
  const controller = useContext(ControllerContext);

  if (controller == null) {
    throw new Error('No remote-ui Controller instance found in context');
  }

  return controller;
}

export function useRemoteReceiver() {
  const receiver = useContext(RemoteReceiverContext);

  if (receiver == null) {
    throw new Error('No remote-ui Receiver instance found in context');
  }

  return receiver;
}

export function useForceUpdate() {
  const [, setState] = useState(Symbol(''));
  return useCallback(() => {
    setState(Symbol(''));
  }, []);
}

export function useOnValueChange<T>(
  value: T,
  onChange: (value: T, oldValue: T) => void,
) {
  const tracked = useRef(value);
  const oldValue = tracked.current;

  if (value !== oldValue) {
    tracked.current = value;
    onChange(value, oldValue);
  }
}

const UNSET = Symbol('unset');

export function useLazyRef<T>(getValue: () => T): MutableRefObject<T> {
  const ref = useRef<T | typeof UNSET>(UNSET);

  if (ref.current === UNSET) {
    ref.current = getValue();
  }

  return ref as MutableRefObject<T>;
}

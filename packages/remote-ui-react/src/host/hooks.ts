import {useState, useRef, useContext, useEffect} from 'react';
import type {RemoteReceiver} from '@shopify/remote-ui-core';

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

type Attachable = Parameters<RemoteReceiver['listen']>[0];

export function useAttached<T extends Attachable>(
  receiver: RemoteReceiver,
  initial: T,
) {
  const [attached, setAttached] = useState(initial);

  const lastAttached = useRef(attached);
  lastAttached.current = attached;

  useEffect(() => {
    const resolved = receiver.get(initial) as T | undefined;

    if (resolved && !deepEqual(resolved, lastAttached.current)) {
      setAttached({...resolved});
    }

    return receiver.listen(initial, () => {
      setAttached({...attached});
    });
  }, [receiver, initial]);

  return attached;
}

function deepEqual<T>(one: T, two: T) {
  return Object.keys(two).every(
    (key) => (one as any)[key] === (two as any)[key],
  );
}

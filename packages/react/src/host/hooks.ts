import {useState, useDebugValue, useContext, useEffect} from 'react';
import type {RemoteReceiver} from '@remote-ui/core';

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

interface State<T extends Attachable> {
  receiver: RemoteReceiver;
  attached: T;
  value: T | null;
}

export function useAttached<T extends Attachable>(
  receiver: RemoteReceiver,
  attached: T,
) {
  const [state, setState] = useState<State<T>>({
    receiver,
    attached,
    value: {...attached},
  });

  let returnValue: T | null = state.value;

  // If parameters have changed since our last render, schedule an update with its current value.
  if (state.receiver !== receiver || state.attached.id !== attached.id) {
    // When the consumer of this hook changes receiver or attached node, the node they switched
    // to might already be unmounted. We guard against that by making sure we don’t get null
    // back from the receiver, and storing the “attached” node in state whether it is actually
    // attached or not, so we have a paper trail of how we got here.
    const updated = receiver.get(attached);

    // If the subscription has been updated, we'll schedule another update with React.
    // React will process this update immediately, so the old subscription value won't be committed.
    // It is still nice to avoid returning a mismatched value though, so let's override the return value.
    returnValue = updated && {...updated};

    setState({
      receiver,
      attached,
      value: returnValue,
    });
  }

  useDebugValue(returnValue);

  useEffect(() => {
    let didUnsubscribe = false;

    const checkForUpdates = () => {
      if (didUnsubscribe) {
        return;
      }

      setState((previousState) => {
        const {
          receiver: previousReceiver,
          value: previousValue,
        } = previousState;

        // Ignore values from stale sources
        if (previousReceiver !== receiver) {
          return previousState;
        }

        // This function is also called as part of the initial useEffect() when the
        // component mounts. It’s possible that between the initial render (when the
        // remote component was for sure attached, to the best of the host’s knowledge)
        // and the effect, the component was removed from the remote tree. You’ll see that
        // the rest of this callback is careful to handle cases where the node is in this
        // state.
        const current = receiver.get(attached);
        const value = current && {...current};

        // If the value hasn't changed, no update is needed.
        // Return state as-is so React can bail out and avoid an unnecessary render.
        if (shallowEqual(previousValue, value)) {
          return previousState;
        }

        return {receiver, attached, value};
      });
    };

    const unsubscribe = receiver.listen(attached, checkForUpdates);

    // Passive effect, so we need to check if anything has changed
    checkForUpdates();

    return () => {
      didUnsubscribe = true;
      unsubscribe();
    };
  }, [receiver, attached]);

  return returnValue;
}

function shallowEqual<T>(one: T, two: T) {
  if (one == null) return two == null;
  if (two == null) return false;

  return Object.keys(two).every(
    (key) => (one as any)[key] === (two as any)[key],
  );
}

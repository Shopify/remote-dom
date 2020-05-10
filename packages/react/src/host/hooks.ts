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

export function useAttached<T extends Attachable>(
  receiver: RemoteReceiver,
  attached: T,
) {
  const [state, setState] = useState({receiver, value: attached});

  let returnValue = state.value;

  // If parameters have changed since our last render, schedule an update with its current value.
  if (state.receiver !== receiver || state.value.id !== attached.id) {
    // If the subscription has been updated, we'll schedule another update with React.
    // React will process this update immediately, so the old subscription value won't be committed.
    // It is still nice to avoid returning a mismatched value though, so let's override the return value.
    returnValue = receiver.get(attached);

    setState({
      receiver,
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

      // We use a state updater function to avoid scheduling work for a stale source.
      // However it's important to eagerly read the currently value,
      // so that all scheduled work shares the same value (in the event of multiple subscriptions).
      // This avoids visual "tearing" when a mutation happens during a (concurrent) render.
      const value = receiver.get(attached);

      setState((previousState) => {
        const {
          receiver: previousReceiver,
          value: previousValue,
        } = previousState;

        // Ignore values from stale sources
        if (previousReceiver !== receiver) {
          return previousState;
        }

        // If the value hasn't changed, no update is needed.
        // Return state as-is so React can bail out and avoid an unnecessary render.
        if (previousValue === value) {
          return previousState;
        }

        return {...previousState, value};
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

import {useState, useDebugValue, useEffect} from 'react';
import type {RemoteReceiver, RemoteReceiverAttachable} from '@remote-ui/core';

interface State<T extends RemoteReceiverAttachable> {
  receiver: RemoteReceiver;
  id: RemoteReceiverAttachable['id'];
  version?: RemoteReceiverAttachable['version'];
  value: T | null;
}

export function useAttached<T extends RemoteReceiverAttachable>(
  receiver: RemoteReceiver,
  attached: T,
) {
  const [state, setState] = useState<State<T>>({
    receiver,
    id: attached.id,
    version: attached.version,
    value: attached,
  });

  let returnValue: T | null = state.value;

  // If parameters have changed since our last render, schedule an update with its current value.
  if (state.receiver !== receiver || state.id !== attached.id) {
    // When the consumer of this hook changes receiver or attached node, the node they switched
    // to might already be unmounted. We guard against that by making sure we don’t get null
    // back from the receiver, and storing the “attached” node in state whether it is actually
    // attached or not, so we have a paper trail of how we got here.
    const updated = receiver.attached.get<T>(attached);

    // If the subscription has been updated, we'll schedule another update with React.
    // React will process this update immediately, so the old subscription value won't be committed.
    // It is still nice to avoid returning a mismatched value though, so let's override the return value.
    returnValue = updated;

    setState({
      receiver,
      id: attached.id,
      version: attached.version,
      value: returnValue,
    });
  }

  useDebugValue(returnValue);

  useEffect(() => {
    let didUnsubscribe = false;

    const checkForUpdates = () => {
      if (didUnsubscribe) return;

      setState((previousState) => {
        const {
          id: previousId,
          version: previousVersion,
          receiver: previousReceiver,
        } = previousState;

        const {id} = attached;

        // Ignore values from stale sources
        if (previousReceiver !== receiver || previousId !== id) {
          return previousState;
        }

        // This function is also called as part of the initial useEffect() when the
        // component mounts. It’s possible that between the initial render (when the
        // remote component was for sure attached, to the best of the host’s knowledge)
        // and the effect, the component was removed from the remote tree. You’ll see that
        // the rest of this callback is careful to handle cases where the node is in this
        // state.
        const value = receiver.attached.get<T>(attached);
        const version = value?.version;

        // If the value hasn't changed, no update is needed.
        // Return state as-is so React can bail out and avoid an unnecessary render.
        if (previousVersion === version) {
          return previousState;
        }

        return {receiver, value, id, version};
      });
    };

    const unsubscribe = receiver.attached.subscribe(attached, checkForUpdates);

    // Passive effect, so we need to check if anything has changed
    checkForUpdates();

    return () => {
      didUnsubscribe = true;
      unsubscribe();
    };
  }, [receiver, attached]);

  return returnValue;
}

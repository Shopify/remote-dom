import {useState, useDebugValue, useEffect} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverNode,
  RemoteReceiverRoot,
} from '@remote-dom/core/receivers';

interface ReceivedState<T extends RemoteReceiverNode | RemoteReceiverRoot> {
  receiver: RemoteReceiver;
  id: RemoteReceiverNode['id'];
  version?: RemoteReceiverNode['version'];
  value?: T;
}

/**
 * Subscribes to a remote node’s updates and returns its current value.
 */
export function useRemoteReceived<
  T extends RemoteReceiverNode | RemoteReceiverRoot,
>(remote: T, receiver: RemoteReceiver): T | undefined {
  const [state, setState] = useState<ReceivedState<T>>(() => {
    const value = receiver.get<T>(remote);

    return {
      id: remote.id,
      version: value?.version,
      value,
      receiver,
    };
  });

  let returnValue: T | undefined = state.value;

  // If parameters have changed since our last render, schedule an update with its current value.
  if (state.receiver !== receiver || state.id !== remote.id) {
    // When the consumer of this hook changes receiver or attached node, the node they switched
    // to might already be unmounted. We guard against that by making sure we don’t get null
    // back from the receiver, and storing the “attached” node in state whether it is actually
    // attached or not, so we have a paper trail of how we got here.
    const updated = receiver.get<T>(remote);

    // If the subscription has been updated, we'll schedule another update with React.
    // React will process this update immediately, so the old subscription value won't be committed.
    // It is still nice to avoid returning a mismatched value though, so let's override the return value.
    returnValue = updated;

    setState({
      receiver,
      id: remote.id,
      version: updated?.version,
      value: returnValue,
    });
  }

  useDebugValue(returnValue);

  useEffect(() => {
    const abort = new AbortController();

    const checkForUpdates = () => {
      if (abort.signal.aborted) return;

      setState((previousState) => {
        const {
          id: previousId,
          version: previousVersion,
          receiver: previousReceiver,
        } = previousState;

        const {id} = remote;

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
        const value = receiver.get<T>(remote);
        const version = value?.version;

        // If the value hasn't changed, no update is needed.
        // Return state as-is so React can bail out and avoid an unnecessary render.
        if (previousVersion === version) {
          return previousState;
        }

        return {receiver, value, id, version};
      });
    };

    receiver.subscribe(remote, checkForUpdates, {signal: abort.signal});

    // Passive effect, so we need to check if anything has changed
    checkForUpdates();

    return () => {
      abort.abort();
    };
  }, [receiver, remote.id]);

  return returnValue;
}

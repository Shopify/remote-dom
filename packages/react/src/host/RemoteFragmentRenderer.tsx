import {memo, useEffect, useMemo} from 'react';
import {
  RemoteFragment,
  RemoteReceiver,
  createRemoteReceiver,
  ACTION_MOUNT,
  isRemoteFragmentSerialization,
} from '@remote-ui/core';

import {RemoteRenderer, useRemoteRender} from './RemoteRenderer';

interface Props {
  fragment?: RemoteFragment;
  receiver?: RemoteReceiver;
}

export const RemoteFragmentRenderer = memo(
  ({fragment, receiver: externalReceiver}: Props) => {
    const {controller, receiver: parentReceiver} = useRemoteRender();
    const defaultReceiver = useMemo(
      () => createRemoteReceiver(),
      // A new receiver must be created for each fragment so they can
      // attach their listeners.
      [fragment],
    );
    const receiver = externalReceiver ?? defaultReceiver;

    useEffect(() => {
      return parentReceiver.addChildReceiver(receiver);
    }, [parentReceiver, receiver]);

    useEffect(() => {
      if (!isRemoteFragmentSerialization(fragment)) {
        return;
      }
      receiver.receive(ACTION_MOUNT, fragment.children);
    }, [receiver, fragment]);

    if (!isRemoteFragmentSerialization(fragment)) {
      return null;
    }

    return <RemoteRenderer controller={controller} receiver={receiver} />;
  },
);

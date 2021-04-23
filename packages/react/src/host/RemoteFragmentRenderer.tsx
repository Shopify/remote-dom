import {memo, useEffect, useMemo} from 'react';
import {
  RemoteFragment,
  RemoteReceiver,
  isRemoteFragment,
  createRemoteReceiver,
  ACTION_MOUNT,
} from '@remote-ui/core';

import {RemoteRenderer, useController} from './RemoteRenderer';

interface Props {
  fragment?: RemoteFragment;
  receiver?: RemoteReceiver;
}

export const RemoteFragmentRenderer = memo(
  ({fragment, receiver: externalReceiver}: Props) => {
    const controller = useController();
    const defaultReceiver = useMemo(
      () => createRemoteReceiver(),
      // A new receiver must be created for each fragment so they can
      // attach their listeners.
      [fragment],
    );
    const receiver = externalReceiver ?? defaultReceiver;
    const shouldRenderFragment = fragment && isRemoteFragment(fragment);

    useEffect(() => {
      if (!fragment || !shouldRenderFragment) {
        return;
      }
      receiver.receive(ACTION_MOUNT, fragment.children as any);
    }, [receiver, fragment, shouldRenderFragment]);

    if (!shouldRenderFragment) {
      return null;
    }

    return <RemoteRenderer controller={controller} receiver={receiver} />;
  },
);

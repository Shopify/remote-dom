import {memo, useEffect, useMemo} from 'react';
import {
  RemoteFragmentSerialization,
  createRemoteReceiver,
  ACTION_MOUNT,
} from '@remote-ui/core';
import type {RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './controller';
// eslint-disable-next-line import/no-cycle
import {RemoteRenderer} from './RemoteRenderer';

interface Props {
  receiver: RemoteReceiver;
  component: RemoteFragmentSerialization;
  controller: Controller;
}

export const RemoteFragment = memo(
  ({receiver: parentReceiver, component, controller}: Props) => {
    const receiver = useMemo(
      () => createRemoteReceiver(),
      // A new receiver must be created for each fragment so they can
      // attach their listeners.
      [component],
    );

    useEffect(() => {
      return parentReceiver.addChildReceiver(receiver);
    }, [parentReceiver, receiver]);

    useEffect(() => {
      receiver.receive(ACTION_MOUNT, component.children);
    }, [receiver, component]);

    return <RemoteRenderer controller={controller} receiver={receiver} />;
  },
);

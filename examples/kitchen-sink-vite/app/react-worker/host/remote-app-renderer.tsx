import React, {useMemo, useEffect} from 'react';
import Worker from '../remote/worker?worker';

import {
  createController,
  createRemoteReceiver,
  RemoteRenderer,
} from '@remote-ui/react/host';

import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';

import {Button} from './components';
import {Endpoint} from '../types';

export function RemoteAppRenderer({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const controller = useMemo(() => createController({Button}), []);
  const receiver = useMemo(() => createRemoteReceiver(), []);

  useEffect(() => {
    async function run() {
      const remoteEndpoint = createEndpoint<Endpoint>(
        fromWebWorker(new Worker()),
      );

      await remoteEndpoint.call.render(receiver.receive, {
        getMessage: async () => inputRef.current!.value,
      });
    }
    run();
  }, [receiver]);

  return <RemoteRenderer receiver={receiver} controller={controller} />;
}

import React, {useMemo, useEffect} from 'react';
import {createWorkerFactory} from '@remote-ui/web-workers';
import {RemoteReceiver, RemoteRenderer, useWorker} from '@remote-ui/react/host';
import {Card, Button} from './components';

const createWorker = createWorkerFactory(() =>
  import(/* webpackChunkName: 'sandbox' */ './sandbox'),
);

const COMPONENTS = {Card, Button};

export function WorkerRenderer({script}: {script: URL}) {
  const receiver = useMemo(() => new RemoteReceiver(), []);
  const worker = useWorker(createWorker);

  useEffect(() => {
    // This runs the exported run() function from our worker
    worker.run(script.href, receiver.receive);
  }, [receiver, worker, script]);

  return <RemoteRenderer receiver={receiver} components={COMPONENTS} />;
}

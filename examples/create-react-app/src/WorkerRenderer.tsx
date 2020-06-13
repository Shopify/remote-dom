import React, {useMemo, useEffect} from 'react';
import {createWorkerFactory, expose} from '@remote-ui/web-workers';
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
    // This allows the worker to "call back" to the main thread. We’ll expose
    // just one method, `authenticatedFetch()`, that we’ll pretend is making
    // a fetch request on behalf of the worker code.
    expose(worker, {
      authenticatedFetch(endpoint: string) {
        return Promise.resolve({auth: true, endpoint, data: {}})
      }
    })

    // This runs the exported run() function from our worker
    worker.run(script.href, receiver.receive, {
      id: 'gid://User/123',
      getDetails: () => Promise.resolve({occupation: 'teacher'})
    });
  }, [receiver, worker, script]);

  return <RemoteRenderer receiver={receiver} components={COMPONENTS} />;
}

import React from 'react';
import ReactDOM from 'react-dom';
import {createPlainWorkerFactory} from '@remote-ui/web-workers';
import {WorkerRenderer} from './WorkerRenderer';

// This utility creates a "plain" worker. It’s just a shortcut to creating
// a JavaScript file that supports being run in a worker, without needing
// a separate asset server or other configuration.
const createExampleWorker = createPlainWorkerFactory(() =>
  import(/* webpackChunkName: 'example' */ './worker/example'),
);

ReactDOM.render(
  <React.StrictMode>
    <WorkerRenderer script={createExampleWorker.url!} />
  </React.StrictMode>,
  document.getElementById('root')
);

import {createEndpoint, fromWebWorker, retain, release} from '@remote-ui/rpc';
import type {Endpoint} from '@remote-ui/rpc';

export {retain, release};

declare global {
  interface WindowOrWorkerGlobalScope {
    readonly endpoint: Endpoint<unknown>;
  }
}

export function expose(api: any) {
  const endpoint = createEndpoint(fromWebWorker(self as any), {
    callable: [],
  });

  self.addEventListener('message', ({data}: MessageEvent) => {
    if (data == null) {
      return;
    }

    if (data.__replace instanceof MessagePort) {
      endpoint.replace(data.__replace);
      data.__replace.start();
    }
  });

  Reflect.defineProperty(self, 'endpoint', {
    value: endpoint,
    enumerable: false,
    writable: false,
    configurable: true,
  });

  endpoint.expose(api);
}

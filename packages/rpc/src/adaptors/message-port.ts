import type {MessageEndpoint} from '../types';

export function fromMessagePort(messagePort: MessagePort): MessageEndpoint {
  messagePort.start();
  return {
    postMessage: (...args: [any, Transferable[]]) =>
      messagePort.postMessage(...args),
    addEventListener: (...args) => messagePort.addEventListener(...args),
    removeEventListener: (...args) => messagePort.removeEventListener(...args),
    terminate() {
      messagePort.close();
    },
  };
}

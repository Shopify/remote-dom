import {DOMRemoteReceiver} from '../receiver/dom.ts';

export class RemoteReceiverElement extends HTMLElement {
  readonly connection: DOMRemoteReceiver['connection'];

  retain?: (value: any) => void;
  release?: (value: any) => void;

  constructor() {
    super();

    const receiver = new DOMRemoteReceiver({
      retain: (value) => this.retain?.(value),
      release: (value) => this.release?.(value),
    });

    receiver.connect(this);
    this.connection = receiver.connection;
  }
}

import {DOMRemoteReceiver} from '../receivers/DOMRemoteReceiver.ts';

type DOMRemoteReceiverOptions = NonNullable<
  ConstructorParameters<typeof DOMRemoteReceiver>[0]
>;

export class RemoteReceiverElement extends HTMLElement {
  readonly connection: DOMRemoteReceiver['connection'];

  retain?: DOMRemoteReceiverOptions['retain'];
  release?: DOMRemoteReceiverOptions['release'];
  call?: DOMRemoteReceiverOptions['call'];

  constructor() {
    super();

    const receiver = new DOMRemoteReceiver({
      root: this,
      call: (...args) => this.call?.(...args),
      retain: (value) => this.retain?.(value),
      release: (value) => this.release?.(value),
    });

    this.connection = receiver.connection;
  }
}

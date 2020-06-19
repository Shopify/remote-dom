import type {DomReceiver} from './receiver';

export class RemoteUiRoot extends HTMLElement {
  private currentReceiver: DomReceiver | undefined;

  set receiver(receiver: DomReceiver | undefined) {
    this.currentReceiver?.unbind();
    this.currentReceiver = receiver;
    if (receiver) receiver.bind(this.shadowRoot!);
  }

  get receiver() {
    return this.currentReceiver;
  }
}

customElements.define('remote-ui-root', RemoteUiRoot);

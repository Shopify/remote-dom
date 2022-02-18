class MessagePortPolyfill implements MessagePort {
  onmessageerror: EventListener | null = null;

  otherPort!: MessagePortPolyfill;
  private listeners = new Set<EventListener>();

  // MessagePort does not send messages unless it is started via start() or attaching .onmessage
  // https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/start
  private started = false;
  private _onmessage: EventListener | null = null;

  public set onmessage(listener: EventListener | null) {
    // setting onmessage will start the port, even if the listener is null.
    this._onmessage = listener;
    this.start();
  }

  dispatchEvent(event: Event) {
    if (!this.started) {
      return true;
    }

    if (this._onmessage) {
      this._onmessage(event);
    }

    for (const listener of this.listeners) {
      listener(event);
    }

    return true;
  }

  postMessage(message: any) {
    if (!this.otherPort || !this.started) {
      return;
    }

    this.otherPort.dispatchEvent({data: message} as any);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type !== 'message') {
      return;
    }

    this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type !== 'message') {
      return;
    }

    this.listeners.delete(listener);
  }

  start() {
    this.started = true;
  }

  close() {
    this.started = false;
  }
}

class MessageChannelPolyfill implements MessageChannel {
  readonly port1: MessagePortPolyfill;
  readonly port2: MessagePortPolyfill;

  constructor() {
    this.port1 = new MessagePortPolyfill();
    this.port2 = new MessagePortPolyfill();
    this.port1.otherPort = this.port2;
    this.port2.otherPort = this.port1;
  }
}

export {MessageChannelPolyfill as MessageChannel};

import {Event} from './Event.ts';

//https://html.spec.whatwg.org/multipage/webappapis.html#promiserejectionevent
export class PromiseRejectionEvent extends Event {
  readonly promise: PromiseRejectionEventInit['promise'];
  readonly reason: PromiseRejectionEventInit['reason'];

  constructor(type: string, eventInitDict: PromiseRejectionEventInit) {
    super(type, eventInitDict);

    this.promise = eventInitDict.promise;
    this.reason = eventInitDict.reason;
  }
}

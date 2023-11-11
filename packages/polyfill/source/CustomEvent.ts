import {Event} from './Event.ts';

export class CustomEvent<T = any> extends Event {
  /**
   * Returns any custom data event was created with. Typically used for synthetic events.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
   */
  readonly detail: T;

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail as any;
  }

  /**
   * Returns any custom data event was created with. Typically used for synthetic events.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
   */
  initCustomEvent(
    type: string,
    bubbles?: boolean,
    cancelable?: boolean,
    detail?: T,
  ) {
    super.initEvent(type, bubbles, cancelable);
    (this as any).detail = detail;
  }
}

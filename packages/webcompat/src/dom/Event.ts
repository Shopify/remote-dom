/* eslint-disable @shopify/typescript/prefer-pascal-case-enums */
import {IS_TRUSTED, LISTENERS} from './constants';
import type {EventTarget} from './EventTarget';

export const enum EventPhase {
  NONE = 0,
  CAPTURING_PHASE = 1,
  AT_TARGET = 2,
  BUBBLING_PHASE = 3,
}

export interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

const now =
  typeof performance === 'undefined'
    ? Date.now
    : performance.now.bind(performance);

export class Event {
  static NONE = EventPhase.NONE;
  static CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  static AT_TARGET = EventPhase.AT_TARGET;
  static BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  // NONE = EventPhase.NONE;
  // CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  // AT_TARGET = EventPhase.AT_TARGET;
  // BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  timeStamp = now();
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  srcElement: EventTarget | null = null;
  bubbles = false;
  cancelable = false;
  composed = false;
  defaultPrevented = false;
  cancelBubble = false;
  immediatePropagationStopped = false;
  eventPhase: EventPhase = 0;
  path: EventTarget[] = [];
  // private inPassiveListener = false;
  data?: any;
  [IS_TRUSTED]!: boolean;

  constructor(public type: string, options?: EventInit) {
    Object.defineProperty(this, IS_TRUSTED, {writable: true, value: false});
    if (options) {
      if (options.bubbles) this.bubbles = options.bubbles;
      if (options.cancelable) this.cancelable = options.cancelable;
      if (options.composed) this.composed = options.composed;
    }
  }

  get composedPath() {
    return this.path;
  }

  get isTrusted() {
    return this[IS_TRUSTED];
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  stopImmediatePropagation() {
    this.immediatePropagationStopped = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  set returnValue(value) {
    this.defaultPrevented = value;
  }

  get returnValue() {
    return this.defaultPrevented;
  }

  /** @deprecated */
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean) {
    this.type = type;
    this.bubbles = Boolean(bubbles);
    this.cancelable = Boolean(cancelable);
  }
}

export function dispatchEvent<T extends object = Record<string, unknown>>(
  this: EventTarget,
  type: string,
  event?: T,
) {
  const ev = new Event(type, event) as Event & T;
  ev[IS_TRUSTED] = true;
  // Copy host event properties except `type`. This is important
  // because the local `type` can have different casing from the host.
  // Object.assign(ev, event);
  // ev.type = type;
  for (const i in event) {
    // if (i in ev) continue;
    if (i === 'isTrusted' || i === 'type') continue;
    // just to make TS happy:
    Reflect.set(ev, i, event[i]);
    // ev[i] = event[i];
  }
  this.dispatchEvent(ev);
}

export function fireEvent(
  event: Event,
  target: EventTarget,
  phase: EventPhase,
) {
  const listeners = target[LISTENERS];
  const list = listeners && listeners.get(event.type);
  if (!list) return false;
  let defaultPrevented = false;
  for (const listener of Array.from(list)) {
    event.eventPhase = phase;
    event.currentTarget = target;
    let ret;
    try {
      if (typeof listener === 'object') {
        listener.handleEvent(event);
      } else {
        listener.call(target, event);
      }
    } catch (err) {
      setTimeout(thrower, 0, err);
    }
    if (ret === false) {
      event.defaultPrevented = true;
    }
    if (event.defaultPrevented === true) {
      defaultPrevented = true;
    }
    if (event.immediatePropagationStopped) {
      break;
    }
  }
  return defaultPrevented;
}

function thrower(error: any) {
  throw error;
}

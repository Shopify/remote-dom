import {
  DISPATCHING,
  PATH,
  IS_TRUSTED,
  LISTENERS,
  STOP_IMMEDIATE_PROPAGATION,
} from './constants.ts';
import type {EventTarget} from './EventTarget.ts';

export const EVENT_PHASE_NONE = 0;
export const EVENT_PHASE_CAPTURING = 1;
export const EVENT_PHASE_AT_TARGET = 2;
export const EVENT_PHASE_BUBBLING = 3;

export type EventPhase = number;

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
  static NONE: EventPhase = EVENT_PHASE_NONE;
  static CAPTURING_PHASE: EventPhase = EVENT_PHASE_CAPTURING;
  static AT_TARGET: EventPhase = EVENT_PHASE_AT_TARGET;
  static BUBBLING_PHASE: EventPhase = EVENT_PHASE_BUBBLING;

  // NONE = EVENT_PHASE_NONE;
  // CAPTURING_PHASE = EVENT_PHASE_CAPTURING;
  // AT_TARGET = EVENT_PHASE_AT_TARGET;
  // BUBBLING_PHASE = EVENT_PHASE_BUBBLING;

  type: string;
  timeStamp = now();
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  srcElement: EventTarget | null = null;
  bubbles = false;
  cancelable = false;
  composed = false;
  defaultPrevented = false;
  cancelBubble = false;
  eventPhase: EventPhase = EVENT_PHASE_NONE;
  // private inPassiveListener = false;
  data?: any;
  [PATH]: EventTarget[] = [];
  [IS_TRUSTED]!: boolean;
  [STOP_IMMEDIATE_PROPAGATION] = false;
  [DISPATCHING] = false;

  constructor(type: string, options?: EventInit) {
    this.type = type;
    Object.defineProperty(this, IS_TRUSTED, {writable: true, value: false});
    if (options) {
      if (options.bubbles) this.bubbles = options.bubbles;
      if (options.cancelable) this.cancelable = options.cancelable;
      if (options.composed) this.composed = options.composed;
    }
  }

  get isTrusted() {
    return this[IS_TRUSTED];
  }

  composedPath() {
    return [...this[PATH]];
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  stopImmediatePropagation() {
    this[STOP_IMMEDIATE_PROPAGATION] = true;
    this.cancelBubble = true;
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }

  set returnValue(value) {
    if (!value) this.preventDefault();
  }

  get returnValue() {
    return !this.defaultPrevented;
  }

  /** @deprecated */
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean) {
    this.type = type;
    this.bubbles = Boolean(bubbles);
    this.cancelable = Boolean(cancelable);
  }
}

export function fireEvent(
  event: Event,
  currentTarget: EventTarget,
  phase: typeof EVENT_PHASE_BUBBLING | typeof EVENT_PHASE_CAPTURING,
): void {
  const listeners = currentTarget[LISTENERS];
  const list = listeners?.get(event.type)?.[
    phase === EVENT_PHASE_CAPTURING ? 'capture' : 'bubble'
  ];

  if (!list) return;

  for (const registration of [...list]) {
    if (!list.has(registration) || registration.signal?.aborted) continue;

    event.eventPhase =
      event.target === currentTarget ? EVENT_PHASE_AT_TARGET : phase;
    event.currentTarget = currentTarget;

    const listener = registration.normalizedListener;
    try {
      if (typeof listener === 'object') {
        listener.handleEvent(event as any);
      } else {
        listener.call(currentTarget, event as any);
      }
    } catch (err) {
      setTimeout(thrower, 0, err);
    }

    if (event[STOP_IMMEDIATE_PROPAGATION]) break;
  }
}

function thrower(error: any) {
  throw error;
}

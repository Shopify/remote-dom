import {HOOKS_DISPATCH, PATH, LISTENERS, OWNER_DOCUMENT} from './constants.ts';
import {
  EVENT_PHASE_BUBBLING,
  EVENT_PHASE_CAPTURING,
  fireEvent,
} from './Event.ts';
import {type Event} from './Event.ts';
import type {ChildNode} from './ChildNode.ts';
import type {Document} from './Document.ts';

const LISTENER_REGISTRATIONS = Symbol('listenerRegistrations');

type ListenerPhase = 'bubble' | 'capture';

interface EventListenersForType {
  bubble?: Set<EventListenerOrEventListenerObject>;
  capture?: Set<EventListenerOrEventListenerObject>;
}

interface ListenerRegistrationsForType {
  bubble?: Map<EventListenerOrEventListenerObject, ListenerRegistration>;
  capture?: Map<EventListenerOrEventListenerObject, ListenerRegistration>;
}

interface ListenerRegistration {
  type: string;
  listener: EventListenerOrEventListenerObject;
  capture: boolean;
  once: boolean;
  normalizedListener: EventListenerOrEventListenerObject;
  signal?: AbortSignal;
  abortListener?: EventListener;
}

export class EventTarget {
  [LISTENERS]: Map<string, EventListenersForType> | undefined = undefined;

  [LISTENER_REGISTRATIONS]:
    | Map<string, ListenerRegistrationsForType>
    | undefined = undefined;

  /**
   * Property set by entities that extend this class that are part of the DOM tree.
   * @internal
   */
  [OWNER_DOCUMENT]: Document | undefined = undefined;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (listener == null) return;

    const capture =
      options === true ||
      (typeof options === 'object' && options.capture === true);
    const once = typeof options === 'object' && options.once === true;
    const signal = typeof options === 'object' ? options.signal : undefined;
    if (signal?.aborted) return;

    const phase = listenerPhase(capture);
    let registrations = this[LISTENER_REGISTRATIONS];
    if (!registrations) {
      registrations = new Map();
      this[LISTENER_REGISTRATIONS] = registrations;
    }

    let registrationsForType = registrations.get(type);
    if (!registrationsForType) {
      registrationsForType = {};
      registrations.set(type, registrationsForType);
    }

    let registrationsForPhase = registrationsForType[phase];
    if (!registrationsForPhase) {
      registrationsForPhase = new Map();
      registrationsForType[phase] = registrationsForPhase;
    }

    if (registrationsForPhase.has(listener)) return;

    const target = this;
    const registration: ListenerRegistration = {
      type,
      listener,
      capture,
      once,
      normalizedListener: listener,
      signal,
    };

    if (once || signal) {
      registration.normalizedListener = function normalizedListener(
        this: EventTarget,
        ...args: Parameters<EventListener>
      ) {
        if (registration.signal?.aborted) {
          removeListenerRegistration(target, registration);
          return;
        }
        if (registration.once) removeListenerRegistration(target, registration);

        return typeof listener === 'object'
          ? listener.handleEvent(...args)
          : listener.call(this, ...args);
      };
    }

    let listeners = this[LISTENERS];
    if (!listeners) {
      listeners = new Map();
      this[LISTENERS] = listeners;
    }

    let listenersForType = listeners.get(type);
    if (!listenersForType) {
      listenersForType = {};
      listeners.set(type, listenersForType);
    }

    let list = listenersForType[phase];
    if (!list) {
      list = new Set();
      listenersForType[phase] = list;
    }

    registrationsForPhase.set(listener, registration);
    list.add(registration.normalizedListener);

    if (signal) {
      const abortListener = () => {
        removeListenerRegistration(target, registration);
      };
      registration.abortListener = abortListener;
      signal.addEventListener('abort', abortListener, {once: true});
    }
    this[OWNER_DOCUMENT]?.defaultView[HOOKS_DISPATCH].addEventListener?.(
      this as any,
      type,
      listener,
      options,
    );
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    return removeEventListener.call(this, type, listener, options);
  }

  // function isChildNode(node: EventTarget): node is ChildNode {
  //   return PARENT in node;
  // }

  dispatchEvent(event: Event) {
    const path: EventTarget[] = [];
    // instanceof here is just to keep TypeScript happy
    let target = this as unknown as ChildNode | null;
    while (target != null) {
      path.push(target);
      target = target.parentNode;
    }
    // while (target instanceof Node && (target = target.parentNode)) {
    //   path.push(target);
    // }
    event.target = this;
    event.srcElement = this;
    event[PATH] = path;

    for (let i = path.length; i--; ) {
      fireEvent(event, path[i]!, EVENT_PHASE_CAPTURING);
      if (event.cancelBubble) return event.defaultPrevented;
    }

    const bubblePath = event.bubbles ? path : path.slice(0, 1);

    for (let i = 0; i < bubblePath.length; i++) {
      fireEvent(event, bubblePath[i]!, EVENT_PHASE_BUBBLING);
      if (event.cancelBubble) return event.defaultPrevented;
    }

    return event.defaultPrevented;
  }
}

function removeEventListener(
  this: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions,
) {
  if (listener == null) return;

  const capture = options === true || (options && options.capture === true);
  const phase = listenerPhase(Boolean(capture));
  const registration =
    this[LISTENER_REGISTRATIONS]?.get(type)?.[phase]?.get(listener);
  if (!registration) return;

  removeListenerRegistration(this, registration);
}

function listenerPhase(capture: boolean): ListenerPhase {
  return capture ? 'capture' : 'bubble';
}

function removeListenerRegistration(
  target: EventTarget,
  registration: ListenerRegistration,
) {
  const phase = listenerPhase(registration.capture);
  const registrations = target[LISTENER_REGISTRATIONS];
  const registrationsForType = registrations?.get(registration.type);
  if (!registrationsForType) return;

  const registrationsForPhase = registrationsForType[phase];
  if (
    !registrationsForPhase ||
    registrationsForPhase.get(registration.listener) !== registration
  ) {
    return;
  }

  registrationsForPhase.delete(registration.listener);
  if (registrationsForPhase.size === 0) delete registrationsForType[phase];
  if (!registrationsForType.bubble && !registrationsForType.capture) {
    registrations?.delete(registration.type);
  }

  if (registration.signal && registration.abortListener) {
    registration.signal.removeEventListener(
      'abort',
      registration.abortListener,
    );
  }

  const listeners = target[LISTENERS];
  const listenersForType = listeners?.get(registration.type);
  if (!listenersForType) return;

  const list = listenersForType[phase];
  if (!list?.delete(registration.normalizedListener)) return;
  if (list.size === 0) delete listenersForType[phase];
  if (!listenersForType.bubble && !listenersForType.capture) {
    listeners?.delete(registration.type);
  }

  target[OWNER_DOCUMENT]?.defaultView[HOOKS_DISPATCH].removeEventListener?.(
    target as any,
    registration.type,
    registration.listener,
    registration.capture,
  );
}

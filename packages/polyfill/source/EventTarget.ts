import {HOOKS, PATH, LISTENERS, OWNER_DOCUMENT} from './constants.ts';
import {fireEvent, EventPhase} from './Event.ts';
import {CAPTURE_MARKER, type Event} from './Event.ts';
import type {ChildNode} from './ChildNode.ts';
import type {Document} from './Document.ts';

const ONCE_LISTENERS = Symbol('onceListeners');

export class EventTarget {
  [LISTENERS]:
    | Map<string, Set<EventListenerOrEventListenerObject>>
    | undefined = undefined;

  [ONCE_LISTENERS]:
    | WeakMap<EventListenerOrEventListenerObject, EventListener>
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

    const capture = options === true || (options && options.capture === true);
    const once = typeof options === 'object' && options.once === true;
    const signal = typeof options === 'object' ? options.signal : undefined;
    const key = `${type}${capture ? CAPTURE_MARKER : ''}`;
    let normalizedListener = listener;

    if (once) {
      normalizedListener = function normalizedListener(
        this: EventTarget,
        ...args: Parameters<EventListener>
      ) {
        this.removeEventListener(type, listener, options);

        return typeof listener === 'object'
          ? listener.handleEvent(...args)
          : listener.call(this, ...args);
      };

      let onceListeners = this[ONCE_LISTENERS];
      if (!onceListeners) {
        onceListeners = new WeakMap();
        this[ONCE_LISTENERS] = onceListeners;
      }

      onceListeners.set(listener, normalizedListener);
    }

    let listeners = this[LISTENERS];
    if (!listeners) {
      listeners = new Map();
      this[LISTENERS] = listeners;
    }

    let list = listeners.get(key);
    if (!list) {
      list = new Set();
      listeners.set(key, list);
    }

    if (list.has(normalizedListener)) return;

    signal?.addEventListener(
      'abort',
      () => {
        removeEventListener.call(this, type, listener, options);
      },
      {once: true},
    );

    list.add(normalizedListener);
    this[OWNER_DOCUMENT]?.defaultView[HOOKS].addEventListener?.(
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
      fireEvent(event, path[i]!, EventPhase.CAPTURING_PHASE);
      if (event.cancelBubble) return event.defaultPrevented;
    }

    const bubblePath = event.bubbles ? path : path.slice(0, 1);

    for (let i = 0; i < bubblePath.length; i++) {
      fireEvent(event, bubblePath[i]!, EventPhase.BUBBLING_PHASE);
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

  const onceListeners = this[ONCE_LISTENERS];
  const normalizedListener = onceListeners?.get(listener) ?? listener;

  onceListeners?.delete(listener);

  const capture = options === true || (options && options.capture === true);
  const key = `${type}${capture ? CAPTURE_MARKER : ''}`;
  const list = this[LISTENERS]?.get(key);

  if (list) {
    const deleted = list.delete(normalizedListener);
    if (deleted) {
      this[OWNER_DOCUMENT]?.defaultView[HOOKS].removeEventListener?.(
        this as any,
        type,
        listener,
        options,
      );
    }
  }
}

import {hooks} from './hooks.ts';
import {LISTENERS} from './constants.ts';
import {fireEvent, EventPhase} from './Event.ts';
import {CAPTURE_MARKER, type Event} from './Event.ts';
import type {ChildNode} from './ChildNode.ts';

const ONCE_LISTENERS = Symbol('onceListeners');

export class EventTarget {
  [LISTENERS]?: Map<string, Set<EventListenerOrEventListenerObject>>;
  [ONCE_LISTENERS]?: WeakMap<EventListenerOrEventListenerObject, EventListener>;

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

    list.add(normalizedListener);

    signal?.addEventListener(
      'abort',
      () => {
        removeEventListener.call(this, type, listener, options);
      },
      {once: true},
    );

    hooks.addEventListener?.(this as any, type, listener, options);
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
    event.path = path;
    let defaultPrevented = false;
    for (let i = path.length; --i; ) {
      if (fireEvent(event, path[i]!, EventPhase.CAPTURING_PHASE)) {
        defaultPrevented = true;
      }
    }
    if (fireEvent(event, this, EventPhase.AT_TARGET)) {
      defaultPrevented = true;
    }
    for (let i = 1; i < path.length; i++) {
      if (fireEvent(event, path[i]!, EventPhase.BUBBLING_PHASE)) {
        defaultPrevented = true;
      }
    }
    return !defaultPrevented;
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
      hooks.removeEventListener?.(this as any, type, listener, options);
    }
  }
}

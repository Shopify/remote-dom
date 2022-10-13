import type {AbstractChannel} from '../protocol';

import {CHANNEL, ID, LISTENERS} from './constants';
import {fireEvent, dispatchEvent, EventPhase} from './Event';
import type {Event} from './Event';
import type {ChildNode} from './ChildNode';

export interface EventListenerOptions {
  capture?: boolean;
}

export interface EventListener {
  (evt: Event): void;
}

export interface EventListenerObject {
  handleEvent(object: Event): void;
}

export type EventListenerOrEventListenerObject =
  | EventListener
  | EventListenerObject;

export class EventTarget {
  [CHANNEL]?: AbstractChannel;
  [ID]?: number;
  [LISTENERS]?: Map<
    string,
    Set<EventListenerOrEventListenerObject> & {proxy?: (event: any) => void}
  >;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const capture = options === true || (options && options.capture === true);
    const key = type + (capture ? '@' : '');
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
    if (list.proxy === undefined) {
      list.proxy = dispatchEvent.bind(this, type);
      const id = this[ID];
      const channel = this[CHANNEL];
      if (id !== undefined && channel) {
        channel.addListener(id, type, list.proxy);
      }
    }
    list.add(listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const capture = options === true || (options && options.capture === true);
    const key = `${type}${capture}`;
    const listeners = this[LISTENERS];
    const list = listeners && listeners.get(key);
    if (list) {
      list.delete(listener);
      const id = this[ID];
      const channel = this[CHANNEL];
      if (id !== undefined && list.proxy !== undefined && channel) {
        channel.removeListener(id, type, list.proxy);
        list.proxy = undefined;
      }
    }
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
      if (fireEvent(event, path[i], EventPhase.CAPTURING_PHASE)) {
        defaultPrevented = true;
      }
    }
    if (fireEvent(event, this, EventPhase.AT_TARGET)) {
      defaultPrevented = true;
    }
    for (let i = 1; i < path.length; i++) {
      if (fireEvent(event, path[i], EventPhase.BUBBLING_PHASE)) {
        defaultPrevented = true;
      }
    }
    return !defaultPrevented;
  }
}

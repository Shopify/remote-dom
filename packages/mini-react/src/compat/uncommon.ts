import {render} from '../render';
import {createElement} from '../create-element';
import {cloneElement as miniCloneElement} from '../clone-element';
import type {VNode, ComponentChildren, RemoteParentNode} from '../types';

import {REACT_ELEMENT_TYPE} from './render';

/**
 * Legacy version of createElement.
 */
export function createFactory<P>(type: VNode<P>['type']) {
  return (createElement as any).bind(null, type) as (
    props?: P,
    ...children: ComponentChildren[]
  ) => VNode<P>;
}

/**
 * Check if the passed element is a valid (p)react node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isValidElement(element: unknown) {
  return Boolean(element) && (element as any).$$typeof === REACT_ELEMENT_TYPE;
}

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 */
export const cloneElement: typeof miniCloneElement = (element, ...args) => {
  if (!isValidElement(element)) return element;
  return miniCloneElement(element, ...args);
};

/**
 * Remove a component tree from the DOM, including state and event handlers.
 * @param {import('./internal').PreactElement} container
 * @returns {boolean}
 */
export function unmountComponentAtNode(container: RemoteParentNode) {
  if (container._vnode) {
    render(null, container);
    return true;
  }

  return false;
}

/**
 * Deprecated way to control batched rendering inside the reconciler, but we
 * already schedule in batches inside our rendering code
 */
export function unstable_batchedUpdates<T>(
  callback: (arg?: T) => void,
  arg?: T,
) {
  callback(arg);
}

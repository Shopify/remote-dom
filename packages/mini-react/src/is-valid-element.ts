import type {VNode} from './types';

/**
 * Check if a the argument is a valid VNode.
 */
export const isValidElement = (vnode: unknown): vnode is VNode<unknown> =>
  vnode != null && (vnode as any).constructor === undefined;

import {_catchError} from './diff/catch-error';
import type {VNode, Component, ComponentChild, RemoteNode} from './types';

export interface Options {
  /** Attach a hook that is invoked whenever a VNode is created. */
  vnode?(vnode: VNode): void;
  /** Attach a hook that is invoked immediately before a vnode is unmounted. */
  unmount?(vnode: VNode): void;
  /** Attach a hook that is invoked after a vnode has rendered. */
  diffed?(vnode: VNode): void;
  event?(e: Event): any;
  requestAnimationFrame?: typeof requestAnimationFrame;
  debounceRendering?(cb: () => void): void;
  useDebugValue?(value: string | number): void;
  __suspenseDidResolve?(vnode: VNode, cb: () => void): void;
  // __canSuspenseResolve?(vnode: VNode, cb: () => void): void;

  /** Attach a hook that is invoked before render, mainly to check the arguments. */
  _root?(vnode: ComponentChild, parent: RemoteNode): void;
  /** Attach a hook that is invoked before a vnode is diffed. */
  _diff?(vnode: VNode): void;
  /** Attach a hook that is invoked after a tree was mounted or was updated. */
  _commit?(vnode: VNode, commitQueue: Component[]): void;
  /** Attach a hook that is invoked before a vnode has rendered. */
  _render?(vnode: VNode): void;
  /** Attach a hook that is invoked before a hook's state is queried. */
  _hook?(component: Component, index: number, type: HookType): void;
  /** Bypass effect execution. Currenty only used in devtools for hooks inspection */
  _skipEffects?: boolean;
  /** Attach a hook that is invoked after an error is caught in a component but before calling lifecycle hooks */
  _catchError(error: any, vnode: VNode<any>, oldVNode?: VNode<any>): void;
}

/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which all our addons like `preact/debug`, `preact/compat`,
 * and `preact/hooks` are based on. See the `Options` type in `internal.d.ts`
 * for a full list of available option hooks (most editors/IDEs allow you to
 * ctrl+click or cmd+click on mac the type definition below).
 */
const options: Options = {
  _catchError,
};

export default options;

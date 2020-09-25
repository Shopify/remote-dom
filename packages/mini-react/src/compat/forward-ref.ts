import options from '../options';
import type {
  Ref,
  ComponentChild,
  ComponentType,
  FunctionComponent,
} from '../types';

type MaybeForwardedComponentType = ComponentType & {_forwarded?: boolean};

export interface ForwardFunction<P = {}, T = any> {
  (props: P, ref: Ref<T>): ComponentChild;
  displayName?: string;
}

const oldDiffHook = options._diff;
options._diff = (vnode) => {
  if ((vnode.type as MaybeForwardedComponentType)?._forwarded && vnode.ref) {
    (vnode.props as any).ref = vnode.ref;
    vnode.ref = undefined;
  }

  oldDiffHook?.(vnode);
};

export const REACT_FORWARD_SYMBOL =
  (typeof Symbol !== 'undefined' && Symbol.for?.('react.forward_ref')) || 0xf47;

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 */
export function forwardRef<T, P = {}>(fn: ForwardFunction<P, T>) {
  // We always have ref in props.ref, except for
  // mobx-react. It will call this function directly
  // and always pass ref as the second argument.
  function Forwarded({ref: propsRef, ...props}: any, ref?: Ref<T>) {
    const resolvedRef = propsRef ?? ref;

    return fn(
      props,
      !resolvedRef ||
        (typeof resolvedRef === 'object' && !('current' in resolvedRef))
        ? null
        : resolvedRef,
    );
  }

  // mobx-react checks for this being present
  Forwarded.$$typeof = REACT_FORWARD_SYMBOL;
  // mobx-react heavily relies on implementation details.
  // It expects an object here with a `render` property,
  // and prototype.render will fail. Without this
  // mobx-react throws.
  Forwarded.render = Forwarded;

  Forwarded.prototype.isReactComponent = true;
  Forwarded._forwarded = true;
  Forwarded.displayName = `ForwardRef(${fn.displayName ?? fn.name})`;
  return Forwarded as FunctionComponent<P>;
}

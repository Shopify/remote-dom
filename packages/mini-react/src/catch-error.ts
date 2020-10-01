import type {VNode, ComponentClass} from './types';

/**
 * Find the closest error boundary to a thrown error and call it.
 */
export function catchError(error: any, vnode: VNode<any>) {
  let handled = false;
  let currentVNode: VNode<any> | null = vnode;
  let currentError = error;

  while (true) {
    currentVNode = vnode._parent;
    const component = currentVNode?._component;

    if (component == null) break;

    if (!component._processingException) {
      try {
        const ctor = component.constructor as ComponentClass<any>;

        if (ctor?.getDerivedStateFromError != null) {
          component.setState(ctor.getDerivedStateFromError(currentError));
          handled = component._dirty;
        }

        if (component.componentDidCatch != null) {
          component.componentDidCatch(currentError);
          handled = component._dirty;
        }

        if (handled) {
          component._pendingError = component;
          return;
        }
      } catch (error) {
        currentError = error;
      }
    }
  }

  throw error;
}

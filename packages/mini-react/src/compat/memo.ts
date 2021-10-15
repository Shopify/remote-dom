import {createElement} from '../create-element';
import {Component} from '../Component';
import type {FunctionComponent, ComponentProps} from '../types';

import {shallowDiffers} from './utilities';

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 */
export function memo<C extends FunctionComponent<any>>(
  TargetComponent: C,
  comparer?: (prev: ComponentProps<C>, next: ComponentProps<C>) => boolean,
): C {
  class Memoed extends Component<any, any> {
    static displayName = `Memo(${
      TargetComponent.displayName ?? TargetComponent.name
    })`;

    static _forwarded = true;

    isReactComponent = true;

    shouldComponentUpdate(nextProps: any) {
      const {props} = this;
      const {ref} = props;

      const updateRef = ref === nextProps.ref;

      if (!updateRef && ref) {
        if (ref.call) {
          ref(null);
        } else {
          ref.current = null;
        }
      }

      if (!comparer) {
        return shallowDiffers(props, nextProps);
      }

      return !comparer(props, nextProps) || !updateRef;
    }

    render(props: any) {
      return createElement(TargetComponent, props);
    }
  }

  return Memoed as any as C;
}

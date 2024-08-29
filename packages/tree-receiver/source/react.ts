import {TreeReceiver, HostNode} from '.';
import {createElement, type ComponentType, type JSX} from 'react';

export {HostNode};

/**
 * HostNodeRemoteReceiver for React.
 */
export class ReactTreeReceiver extends TreeReceiver<
  ComponentType,
  JSX.Element
> {
  _createElement(type: ComponentType, props: any): JSX.Element {
    return createElement(type, props);
  }
}

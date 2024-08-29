import {TreeReceiver, HostNode} from '.';
import {createElement, type ComponentType, type JSX} from 'preact';

export {HostNode};

/**
 * HostNodeRemoteReceiver for Preact.
 * Unlike the React version, this uses Preact's API to perform subtree updates.
 */
export class PreactTreeReceiver extends TreeReceiver<
  ComponentType,
  JSX.Element
> {
  _createElement(type: ComponentType, props: any): JSX.Element {
    return createElement(type, props);
  }

  /**
   * Optimization: Preact supports updating JSX Elements in-place.
   * When a previously-materialized node is invalidated, re-render
   * its backing Preact component rather than starting from the root.
   */
  _beforeTriggerRender(source: HostNode) {
    if (source.isRoot) return;
    const cache = source.cache;
    const component = (cache as any)?.__c;
    if (!cache || !component) return;
    // compute new props from HostNode
    source.cache = undefined;
    cache.props = source.resolved().props;
    source.cache = cache;
    component.__v.props = cache.props;
    component.props = cache.props;
    if (source.parent && source.parent.children && source.parent.cache) {
      const index = source.parent.children.indexOf(source);
      source.parent.cache.props.children[index] = cache;
    }
    component.setState({});
    return false;
  }
}

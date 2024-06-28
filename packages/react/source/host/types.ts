import type {ComponentType} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverElement,
} from '@remote-dom/core/receivers';

/**
 * The context needed to render a remote node on the host.
 */
export interface RemoteNodeRenderOptions {
  /**
   * The object that maintains the state of the remote tree on the host.
   */
  receiver: RemoteReceiver;

  /**
   * A map of React components that can render remote elements.
   */
  components: RemoteComponentRendererMap<any>;
}

/**
 * The props that are passed to a React component in order to render
 * a remote element.
 */
export interface RemoteComponentRendererProps extends RemoteNodeRenderOptions {
  /**
   * The element being rendered.
   */
  element: RemoteReceiverElement;
}

/**
 * A map of React components that can render remote elements. The keys are strings
 * that correspond to the names of the elements used in the remote environment, and
 * the values are React components that will accept the remote elements and render
 * DOM elements. To create these components, you can use the `createRemoteComponentRenderer()`
 * utility, which takes care of subscribing to changes in the element and passing their
 * properties along to your React implementation.
 */
export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;

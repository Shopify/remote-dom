import {
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
} from '@remote-dom/core';
import type {
  SignalRemoteReceiver,
  SignalRemoteReceiverNode,
} from '@remote-dom/signals';

import type {RemoteComponentRendererMap} from './types.ts';

/**
 * The context needed to render a remote node on the host.
 */
export interface RenderRemoteNodeOptions {
  /**
   * The object that maintains the state of the remote tree on the host.
   */
  receiver: SignalRemoteReceiver;

  /**
   * A map of Preact components that can render remote elements.
   */
  components: RemoteComponentRendererMap<any>;
}

/**
 * Renders a remote node to the host using Preact.
 *
 * @param node The remote node to render using Preact
 */
export function renderRemoteNode(
  node: SignalRemoteReceiverNode,
  {receiver, components}: RenderRemoteNodeOptions,
) {
  switch (node.type) {
    case NODE_TYPE_ELEMENT: {
      const Component = components.get(node.element);

      if (Component == null) {
        throw new Error(
          `No component found for remote element: ${node.element}`,
        );
      }

      return (
        <Component
          key={node.id}
          element={node}
          receiver={receiver}
          components={components}
        />
      );
    }
    case NODE_TYPE_TEXT: {
      // @preact/signals knows how to convert a string signal to a text node
      return node.data;
    }
    case NODE_TYPE_COMMENT: {
      // Don’t both rendering comments
      return null;
    }
    default: {
      throw new Error(`Unknown remote node type: ${String(node)}`);
    }
  }
}

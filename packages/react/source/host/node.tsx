import {type RemoteReceiverNode} from '@remote-dom/core/receivers';

import {RemoteTextRenderer} from './RemoteTextRenderer.tsx';
import type {RemoteNodeRenderOptions} from './types.ts';

/**
 * Renders a remote node to the host using React.
 *
 * @param node The remote node to render using React
 */
export function renderRemoteNode(
  node: RemoteReceiverNode,
  {receiver, components}: RemoteNodeRenderOptions,
) {
  switch (node.type) {
    case 1: {
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
    case 3: {
      return (
        <RemoteTextRenderer key={node.id} remote={node} receiver={receiver} />
      );
    }
    case 8: {
      return null;
    }
    default: {
      throw new Error(`Unknown remote node type: ${String(node)}`);
    }
  }
}

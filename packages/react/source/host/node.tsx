import {
  type RemoteReceiver,
  type RemoteReceiverNode,
} from '@remote-dom/core/receiver';

import {RemoteTextRenderer} from './RemoteTextRenderer.tsx';
import type {RemoteComponentRendererMap} from './types.ts';

export interface RenderRemoteNodeOptions {
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export function renderRemoteNode(
  node: RemoteReceiverNode,
  {receiver, components}: RenderRemoteNodeOptions,
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

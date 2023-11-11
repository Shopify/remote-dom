import {
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
} from '@remote-dom/core';
import type {
  SignalRemoteReceiver,
  SignalRemoteReceiverNode,
} from '@remote-dom/signals/receiver';

import {RemoteTextRenderer} from './RemoteTextRenderer.tsx';
import type {RemoteComponentRendererMap} from './types.ts';

export interface RenderRemoteNodeOptions {
  receiver: SignalRemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

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
      return (
        <RemoteTextRenderer key={node.id} text={node} receiver={receiver} />
      );
    }
    case NODE_TYPE_COMMENT: {
      return null;
    }
    default: {
      throw new Error(`Unknown remote node type: ${String(node)}`);
    }
  }
}

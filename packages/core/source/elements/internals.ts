import {
  REMOTE_ID,
  REMOTE_CONNECTION,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../constants.ts';
import type {RemoteConnection, RemoteNodeSerialization} from '../types.ts';

let id = 0;

export type RemoteConnectedNode<T extends Node = Node> = T & {
  [REMOTE_ID]?: string;
  [REMOTE_CONNECTION]?: RemoteConnection;
  [REMOTE_PROPERTIES]?: Record<string, unknown>;
};

export function remoteId(node: RemoteConnectedNode) {
  if (node[REMOTE_ID] == null) {
    node[REMOTE_ID] = String(id++);
  }

  return node[REMOTE_ID];
}

export function remoteProperties(node: RemoteConnectedNode) {
  if (node[REMOTE_PROPERTIES] != null) return node[REMOTE_PROPERTIES];
  if ((node as any).attributes == null) return undefined;

  const properties: Record<string, string> = {};

  for (const {name, value} of (node as Element).attributes) {
    properties[name] = value;
  }

  return properties;
}

export function updateRemoteElementProperty(
  node: Element,
  property: string,
  value: unknown,
) {
  let properties = (node as RemoteConnectedNode)[REMOTE_PROPERTIES];

  if (properties == null) {
    properties = {};
    (node as any)[REMOTE_PROPERTIES] = properties;
  }

  if (properties[property] === value) return;

  properties[property] = value;

  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];

  if (connection == null) return;

  connection.mutate([
    [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(node), property, value],
  ]);
}

export function connectRemoteNode(
  node: RemoteConnectedNode,
  connection: RemoteConnection,
) {
  if ((node as any)[REMOTE_CONNECTION] === connection) return;

  (node as any)[REMOTE_CONNECTION] = connection;

  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      connectRemoteNode(node.childNodes[i]!, connection);
    }
  }
}

export function disconnectRemoteNode(node: RemoteConnectedNode) {
  if ((node as any)[REMOTE_CONNECTION] == null) return;

  (node as any)[REMOTE_CONNECTION] = undefined;

  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      disconnectRemoteNode(node.childNodes[i]!);
    }
  }
}

export function serializeRemoteNode(node: Node): RemoteNodeSerialization {
  const {nodeType} = node;

  switch (nodeType) {
    // Element
    case 1: {
      return {
        id: remoteId(node),
        type: nodeType,
        element: (node as Element).localName,
        properties: Object.assign({}, remoteProperties(node)),
        children: Array.from(node.childNodes).map(serializeRemoteNode),
      };
    }
    // TextNode
    case 3:
    // Comment
    // eslint-disable-next-line no-fallthrough
    case 8: {
      return {
        id: remoteId(node),
        type: nodeType,
        data: (node as Text).data,
      };
    }
    default: {
      throw new Error(
        `Cannot serialize node of type ${
          node.nodeType
        } (${typeof node.nodeType})`,
      );
    }
  }
}

export function callRemoteElementMethod(
  node: Element,
  method: string,
  ...args: unknown[]
) {
  const id = (node as RemoteConnectedNode)[REMOTE_ID];
  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];

  if (id == null || connection == null) {
    throw new Error(`Cannot call method ${method} on an unconnected node`);
  }

  return connection.call(id, method, ...args);
}

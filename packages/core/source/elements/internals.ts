import {
  REMOTE_ID,
  REMOTE_CALLBACK,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../constants.ts';
import type {
  RemoteMutationCallback,
  RemoteNodeSerialization,
} from '../types.ts';

let id = 0;

export function remoteId(node: Node & {[REMOTE_ID]?: string}) {
  if (node[REMOTE_ID] == null) {
    node[REMOTE_ID] = String(id++);
  }

  return node[REMOTE_ID];
}

export function remoteProperties(
  node: Node & {[REMOTE_PROPERTIES]?: Record<string, unknown>},
) {
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
  let properties = (node as any)[REMOTE_PROPERTIES];

  if (properties == null) {
    properties = {};
    (node as any)[REMOTE_PROPERTIES] = properties;
  }

  if (properties[property] === value) return;

  properties[property] = value;

  const callback = (node as any)[REMOTE_CALLBACK];

  if (callback == null) return;

  callback([[MUTATION_TYPE_UPDATE_PROPERTY, remoteId(node), property, value]]);
}

export function connectRemoteNode(
  node: Node,
  callback: RemoteMutationCallback,
) {
  if ((node as any)[REMOTE_CALLBACK] === callback) return;

  (node as any)[REMOTE_CALLBACK] = callback;

  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      connectRemoteNode(node.childNodes[i]!, callback);
    }
  }
}

export function disconnectRemoteNode(node: Node) {
  if ((node as any)[REMOTE_CALLBACK] == null) return;

  (node as any)[REMOTE_CALLBACK] = undefined;

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
        properties: remoteProperties(node),
        children: Array.from(node.childNodes).map(serializeRemoteNode),
      };
    }
    // TextNode
    case 3:
    // Comment
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

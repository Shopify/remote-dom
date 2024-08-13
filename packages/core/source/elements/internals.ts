import {LISTENERS} from '@remote-dom/polyfill';
import {
  REMOTE_ID,
  REMOTE_CONNECTION,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../constants.ts';
import type {RemoteConnection, RemoteNodeSerialization} from '../types.ts';

let id = 0;

/**
 * Additional properties that are assigned to a node to keep track of its
 * connection to a remote root.
 */
export interface RemoteConnectedNodeProperties {
  /**
   * A unique identifier representing this node.
   */
  [REMOTE_ID]?: string;

  /**
   * The `RemoteConnection` object that connects this node’s remote root
   * and a receiver on the host.
   */
  [REMOTE_CONNECTION]?: RemoteConnection;

  /**
   * The properties to synchronize between this node and its host representation.
   */
  [REMOTE_PROPERTIES]?: Record<string, unknown>;
}

/**
 * A node of type `T`, but with the additional properties that are assigned
 * to keep track of its connection to a remote root.
 */
export type RemoteConnectedNode<T extends Node = Node> = T &
  RemoteConnectedNodeProperties;

/**
 * Gets the unique identifier representing a node. If the node does not have
 * a unique identifier, one is created and assigned when calling this method.
 */
export function remoteId(node: RemoteConnectedNode) {
  if (node[REMOTE_ID] == null) {
    node[REMOTE_ID] = String(id++);
  }

  return node[REMOTE_ID];
}

/**
 * Gets the remote properties of an element node. If the node is not an element
 * node, this method returns `undefined`. If the element does not have any remote
 * properties, this method will instead return the `attributes` of the element,
 * converted into a simple object form. This makes it easy for you to represent
 * “standard” HTML elements, such as `<div>` or `<span>`, as remote elements.
 */
export function remoteProperties(node: RemoteConnectedNode) {
  if (node[REMOTE_PROPERTIES] != null) return node[REMOTE_PROPERTIES];
  if ((node as any).attributes == null) return undefined;

  const properties: Record<string, string> = {};

  for (const {name, value} of (node as Element).attributes) {
    properties[name] = value;
  }

  return properties;
}

/**
 * Updates a single remote property on an element node. If the element is
 * connected to a remote root, this function will also make a `mutate()` call
 * to communicate the change to the host.
 */
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

/**
 * Connects a node to a `RemoteConnection` instance. Any future updates to this node
 * will be communicated to the host by way of this connection.
 */
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

/**
 * Disconnects a node from its `RemoteConnection` instance. Future updates to this
 * this element will not be communicated to a host, until you call `connectRemoteNode` again.
 */
export function disconnectRemoteNode(node: RemoteConnectedNode) {
  if ((node as any)[REMOTE_CONNECTION] == null) return;

  (node as any)[REMOTE_CONNECTION] = undefined;

  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      disconnectRemoteNode(node.childNodes[i]!);
    }
  }
}

/**
 * Converts an HTML Node into a simple JavaScript object, in the shape that
 * `RemoteConnection.mutate()` expects to receive.
 */
export function serializeRemoteNode(node: Node): RemoteNodeSerialization {
  const {nodeType} = node;

  switch (nodeType) {
    // Element
    case 1: {
      let events: string[] | undefined;
      const listeners = (node as any)[LISTENERS];
      if (listeners) {
        events = [];
        for (const [type, list] of listeners) {
          if (list.size) events.push(type);
        }
      }
      return {
        id: remoteId(node),
        type: nodeType,
        element: (node as Element).localName,
        properties: Object.assign({}, remoteProperties(node)),
        events,
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
        data: (node as Text | Comment).data,
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

/**
 * Performs a method through `RemoteConnection.call()`, using the remote ID and
 * connection for the provided node.
 */
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

import {
  REMOTE_ID,
  REMOTE_CONNECTION,
  REMOTE_PROPERTIES,
  REMOTE_ATTRIBUTES,
  REMOTE_EVENT_LISTENERS,
  MUTATION_TYPE_UPDATE_PROPERTY,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
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

  /**
   * The attributes to synchronize between this node and its host representation.
   */
  [REMOTE_ATTRIBUTES]?: Record<string, string>;

  /**
   * The event listeners to synchronize between this node and its host representation.
   */
  [REMOTE_EVENT_LISTENERS]?: Record<string, (...args: any[]) => any>;
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
 * node, this method returns `undefined`, or if it does not have any remote properties,
 * it will return undefined.
 */
export function remoteProperties(node: RemoteConnectedNode) {
  return node[REMOTE_PROPERTIES];
}

/**
 * Gets the remote attributes of an element node. If the node is not an element
 * node, this method returns `undefined`. If the element does not have any remote
 * attributes explicitly defined, this method will instead return the `attributes`
 * of the element, converted into a simple object form. This makes it easy for you
 * to represent “standard” HTML elements, such as `<div>` or `<span>`, as remote
 * elements.
 */
export function remoteAttributes(node: RemoteConnectedNode) {
  if (node[REMOTE_ATTRIBUTES] != null) return node[REMOTE_ATTRIBUTES];
  if ((node as any).attributes == null) return undefined;

  const attributes: Record<string, string> = {};

  for (const {name, value} of (node as Element).attributes) {
    attributes[name] = value;
  }

  return attributes;
}

/**
 * Gets the remote event listeners of an element node. If the node is not an element
 * node, or does not have explicitly defined remote event listeners, this method returns
 * `undefined`.
 */
export function remoteEventListeners(node: RemoteConnectedNode) {
  return node[REMOTE_EVENT_LISTENERS];
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
    [
      MUTATION_TYPE_UPDATE_PROPERTY,
      remoteId(node),
      property,
      value,
      UPDATE_PROPERTY_TYPE_PROPERTY,
    ],
  ]);
}

/**
 * Updates a single remote attribute on an element node. If the element is
 * connected to a remote root, this function will also make a `mutate()` call
 * to communicate the change to the host.
 */
export function updateRemoteElementAttribute(
  node: Element,
  attribute: string,
  value?: string,
) {
  const remoteAttributes = (node as RemoteConnectedNode)[REMOTE_ATTRIBUTES];

  if (remoteAttributes) {
    if (remoteAttributes[attribute] === value) return;

    if (value == null) {
      delete remoteAttributes[attribute];
    } else {
      remoteAttributes[attribute] = value;
    }
  }

  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];

  if (connection == null) return;

  connection.mutate([
    [
      MUTATION_TYPE_UPDATE_PROPERTY,
      remoteId(node),
      attribute,
      value,
      UPDATE_PROPERTY_TYPE_ATTRIBUTE,
    ],
  ]);
}

/**
 * Updates a single remote event listener on an element node. If the element is
 * connected to a remote root, this function will also make a `mutate()` call
 * to communicate the change to the host.
 */
export function updateRemoteElementEventListener(
  node: Element,
  event: string,
  listener?: (...args: any[]) => any,
) {
  const remoteEventListeners = (node as RemoteConnectedNode)[
    REMOTE_EVENT_LISTENERS
  ];

  if (remoteEventListeners) {
    if (remoteEventListeners[event] === listener) return;

    if (listener == null) {
      delete remoteEventListeners[event];
    } else {
      remoteEventListeners[event] = listener;
    }
  }

  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];

  if (connection == null) return;

  connection.mutate([
    [
      MUTATION_TYPE_UPDATE_PROPERTY,
      remoteId(node),
      event,
      listener,
      UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
    ],
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
      return {
        id: remoteId(node),
        type: nodeType,
        element: (node as Element).localName,
        properties: cloneMaybeObject(remoteProperties(node)),
        attributes: cloneMaybeObject(remoteAttributes(node)),
        eventListeners: cloneMaybeObject(remoteEventListeners(node)),
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

function cloneMaybeObject<T>(maybeObject?: T): T | undefined {
  return maybeObject ? {...maybeObject} : undefined;
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

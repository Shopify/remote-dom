import {
  MUTATION_TYPE_UPDATE_PROPERTY,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
} from '../constants.ts';
import type {RemoteConnection, RemoteNodeSerialization} from '../types.ts';

export const REMOTE_CONNECTIONS = new WeakMap<Node, RemoteConnection>();

/**
 * Gets the `RemoteConnection` instance that a node is connected to. If the node
 * is not connected to a remote root, this method returns `undefined`.
 */
export function remoteConnection(node: Node) {
  return REMOTE_CONNECTIONS.get(node);
}

export const REMOTE_IDS = new WeakMap<Node, string>();
let id = 0;

/**
 * Gets the unique identifier representing a node. If the node does not have
 * a unique identifier, one is created and assigned when calling this method.
 */
export function remoteId(node: Node) {
  let remoteID = REMOTE_IDS.get(node);
  if (remoteID == null) {
    remoteID = String(id++);
    REMOTE_IDS.set(node, remoteID);
  }

  return remoteID;
}

export const REMOTE_PROPERTIES = new WeakMap<Node, Record<string, any>>();

/**
 * Gets the remote properties of an element node. If the node is not an element
 * node, this method returns `undefined`, or if it does not have any remote properties,
 * it will return undefined.
 */
export function remoteProperties(node: Node) {
  return REMOTE_PROPERTIES.get(node);
}

export const REMOTE_ATTRIBUTES = new WeakMap<Node, Record<string, string>>();

/**
 * Gets the remote attributes of an element node. If the node is not an element
 * node, this method returns `undefined`. If the element does not have any remote
 * attributes explicitly defined, this method will instead return the `attributes`
 * of the element, converted into a simple object form. This makes it easy for you
 * to represent “standard” HTML elements, such as `<div>` or `<span>`, as remote
 * elements.
 */
export function remoteAttributes(node: Node) {
  let attributes = REMOTE_ATTRIBUTES.get(node);

  if (attributes != null) return attributes;

  // Custom elements are expected to handle their own attribute updates
  if (!(node instanceof Element) || node.tagName.includes('-'))
    return undefined;

  attributes = {};

  for (const {name, value} of node.attributes) {
    attributes[name] = value;
  }

  return attributes;
}

export const REMOTE_EVENT_LISTENERS = new WeakMap<
  Node,
  Record<string, (...args: any) => void>
>();

/**
 * Gets the remote event listeners of an element node. If the node is not an element
 * node, or does not have explicitly defined remote event listeners, this method returns
 * `undefined`.
 */
export function remoteEventListeners(node: Node) {
  return REMOTE_EVENT_LISTENERS.get(node);
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
  let properties = REMOTE_PROPERTIES.get(node);

  if (properties == null) {
    properties = {};
    REMOTE_PROPERTIES.set(node, properties);
  }

  if (properties[property] === value) return;

  properties[property] = value;

  const connection = REMOTE_CONNECTIONS.get(node);

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
  let attributes = REMOTE_ATTRIBUTES.get(node);

  if (attributes == null) {
    attributes = {};
    REMOTE_ATTRIBUTES.set(node, attributes);
  }

  if (attributes[attribute] === value) return;

  if (value == null) {
    delete attributes[attribute];
  } else {
    attributes[attribute] = String(value);
  }

  const connection = REMOTE_CONNECTIONS.get(node);

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
  let eventListeners = REMOTE_EVENT_LISTENERS.get(node);

  if (eventListeners == null) {
    eventListeners = {};
    REMOTE_EVENT_LISTENERS.set(node, eventListeners);
  }

  if (eventListeners[event] === listener) return;

  if (listener == null) {
    delete eventListeners[event];
  } else {
    eventListeners[event] = listener;
  }

  const connection = REMOTE_CONNECTIONS.get(node);

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
export function connectRemoteNode(node: Node, connection: RemoteConnection) {
  const existingConnection = REMOTE_CONNECTIONS.get(node);

  if (existingConnection === connection) return;

  REMOTE_CONNECTIONS.set(node, connection);

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
export function disconnectRemoteNode(node: Node) {
  const existingConnection = REMOTE_CONNECTIONS.get(node);

  if (existingConnection == null) return;

  REMOTE_CONNECTIONS.delete(node);

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
  const id = REMOTE_IDS.get(node);
  const connection = REMOTE_CONNECTIONS.get(node);

  if (id == null || connection == null) {
    throw new Error(`Cannot call method ${method} on an unconnected node`);
  }

  return connection.call(id, method, ...args);
}

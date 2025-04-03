import type {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from './constants.ts';

/**
 * Describes a remote node being inserted into the tree.
 */
export type RemoteMutationRecordInsertChild = [
  type: typeof MUTATION_TYPE_INSERT_CHILD,

  /**
   * The ID of the parent node.
   */
  parentId: string,

  /**
   * A description of the child node being inserted.
   */
  child:
    | RemoteTextSerialization
    | RemoteCommentSerialization
    | RemoteElementSerialization,

  /**
   * The index in the parents’ children to insert the new child.
   */
  nextSiblingId: string | undefined,
];

/**
 * Describes a remote node being removed from the tree.
 */
export type RemoteMutationRecordRemoveChild = [
  type: typeof MUTATION_TYPE_REMOVE_CHILD,

  /**
   * The ID of the parent node.
   */
  parentId: string,

  /**
   * The ID of the child to remove.
   */
  id: string,
];

/**
 * Describes an update to the content of a remote text node.
 */
export type RemoteMutationRecordUpdateText = [
  type: typeof MUTATION_TYPE_UPDATE_TEXT,

  /**
   * The ID of the text node being updated.
   */
  id: string,

  /**
   * The new text content.
   */
  text: string,
];

/**
 * Describes an update to the property of a remote element. A “remote property”
 * represents either an HTML element property, event listener, or attribute.
 */
export type RemoteMutationRecordUpdateProperty = [
  type: typeof MUTATION_TYPE_UPDATE_PROPERTY,

  /**
   * The ID of the element being updated.
   */
  id: string,

  /**
   * The name of the property being updated.
   */
  name: string,

  /**
   * The new value of the property.
   */
  value: unknown,

  /**
   * The kind of property being updated.
   * @default UPDATE_PROPERTY_TYPE_PROPERTY
   */
  updateType?:
    | typeof UPDATE_PROPERTY_TYPE_PROPERTY
    | typeof UPDATE_PROPERTY_TYPE_EVENT_LISTENER
    | typeof UPDATE_PROPERTY_TYPE_ATTRIBUTE,
];

/**
 * Describes any mutation to the remote tree of nodes.
 */
export type RemoteMutationRecord =
  | RemoteMutationRecordInsertChild
  | RemoteMutationRecordRemoveChild
  | RemoteMutationRecordUpdateText
  | RemoteMutationRecordUpdateProperty;

/**
 * An object that can synchronize a tree of elements between two JavaScript
 * environments. This object acts as a “thin waist”, allowing for efficient
 * communication of changes between a “remote” environment (usually, a JavaScript
 * sandbox, such as an `iframe` or Web Worker) and a “host” environment
 * (usually, a top-level browser page).
 */
export interface RemoteConnection {
  /**
   * Communicates a list of changes to the tree of remote elements.
   */
  mutate(records: readonly RemoteMutationRecord[]): void;

  /**
   * Calls a method on the host version of an element.
   *
   * @param id The ID of the element to call the method on.
   * @param method The name of the method to call on the host version element.
   * @param args The list of arguments to pass to the method.
   * @returns The return value of the method.
   */
  call(id: string, method: string, ...args: readonly unknown[]): unknown;
}

/**
 * Represents an element node of a remote tree in a plain JavaScript format.
 */
export interface RemoteElementSerialization {
  /**
   * A unique identifier for the node.
   */
  readonly id: string;

  /**
   * The type of node. This value is always `1` for element nodes.
   */
  readonly type: typeof NODE_TYPE_ELEMENT;

  /**
   * The name of the element, which will be the name of the custom
   * element representing this node.
   */
  readonly element: string;

  /**
   * The instance properties of this element that should be synchronized
   * between the remote and host environments.
   */
  readonly properties?: Record<string, unknown>;

  /**
   * The attributes of the element that should be synchronized between the
   * remote and host environments.
   */
  readonly attributes?: Record<string, string>;

  /**
   * The event listeners that should be synchronized between the remote and
   * host environments.
   */
  readonly eventListeners?: Record<string, (...args: any) => any>;

  /**
   * The list of child nodes of this element.
   */
  readonly children: readonly RemoteNodeSerialization[];
}

/**
 * Represents a text node of a remote tree in a plain JavaScript format.
 */
export interface RemoteTextSerialization {
  /**
   * A unique identifier for the node.
   */
  readonly id: string;

  /**
   * The type of node. This value is always `3` for text nodes.
   */
  readonly type: typeof NODE_TYPE_TEXT;

  /**
   * The text content of the node.
   */
  readonly data: string;
}

/**
 * Represents a comment node of a remote tree in a plain JavaScript format.
 */
export interface RemoteCommentSerialization {
  /**
   * A unique identifier for the node.
   */
  readonly id: string;

  /**
   * The type of node. This value is always `8` for comment nodes.
   */
  readonly type: typeof NODE_TYPE_COMMENT;

  /**
   * The text content of the comment.
   */
  readonly data: string;
}

/**
 * Represents any node that can be synchronized between the host and
 * remote environments.
 */
export type RemoteNodeSerialization =
  | RemoteTextSerialization
  | RemoteCommentSerialization
  | RemoteElementSerialization;

import type {
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';

/**
 * Describes a remote node being inserted into the tree.
 */
export type RemoteMutationRecordInsertChild = [
  type: typeof MUTATION_TYPE_INSERT_CHILD,

  /**
   * The ID of the parent node.
   */
  id: string,

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
  index: number,
];

/**
 * Describes a remote node being removed from the tree.
 */
export type RemoteMutationRecordRemoveChild = [
  type: typeof MUTATION_TYPE_REMOVE_CHILD,

  /**
   * The ID of the parent node.
   */
  id: string,

  /**
   * The index of the child to remove.
   */
  index: number,
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
 * Describes an update to the property of a remote element.
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
  property: string,

  /**
   * The new value of the property.
   */
  value: unknown,
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

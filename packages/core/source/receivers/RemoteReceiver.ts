import {createRemoteConnection, type RemoteConnection} from '../connection.ts';
import {
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_ROOT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../constants.ts';
import type {
  RemoteCommentSerialization,
  RemoteElementSerialization,
  RemoteNodeSerialization,
  RemoteTextSerialization,
} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

/**
 * Represents a text node of a remote tree in a plain JavaScript format, with
 * the addition of a `version` property that is incremented whenever the
 * node is updated.
 */
export interface RemoteReceiverText extends RemoteTextSerialization {
  readonly version: number;
}

/**
 * Represents a comment node of a remote tree in a plain JavaScript format, with
 * the addition of a `version` property that is incremented whenever the
 * node is updated.
 */
export interface RemoteReceiverComment extends RemoteCommentSerialization {
  readonly version: number;
}

/**
 * Represents an element node of a remote tree in a plain JavaScript format, with
 * the addition of a `version` property that is incremented whenever the
 * node is updated.
 */
export interface RemoteReceiverElement
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: NonNullable<RemoteElementSerialization['properties']>;
  readonly attributes: NonNullable<RemoteElementSerialization['attributes']>;
  readonly eventListeners: NonNullable<
    RemoteElementSerialization['eventListeners']
  >;
  readonly children: readonly RemoteReceiverNode[];
  readonly version: number;
}

/**
 * Represents the root node of the remote tree in a plain JavaScript format, with
 * the addition of a `version` property that is incremented whenever the
 * root is updated.
 */
export interface RemoteReceiverRoot {
  readonly id: typeof ROOT_ID;
  readonly type: typeof NODE_TYPE_ROOT;
  readonly children: readonly RemoteReceiverNode[];
  readonly properties: NonNullable<RemoteElementSerialization['properties']>;
  readonly attributes: NonNullable<RemoteElementSerialization['attributes']>;
  readonly eventListeners: NonNullable<
    RemoteElementSerialization['eventListeners']
  >;
  readonly version: number;
}

/**
 * Represents any node that can be stored in the host representation of the remote tree.
 */
export type RemoteReceiverNode =
  | RemoteReceiverText
  | RemoteReceiverComment
  | RemoteReceiverElement;

/**
 * Any node in the remote tree that can have children nodes.
 */
export type RemoteReceiverParent = RemoteReceiverElement | RemoteReceiverRoot;

type RemoteReceiverNodeOrRoot = RemoteReceiverNode | RemoteReceiverRoot;

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * A `RemoteReceiver` stores remote elements into a basic JavaScript representation,
 * and allows subscribing to individual elements in the remote environment.
 * This can be useful for mapping remote elements to components in a JavaScript
 * framework; for example, the [`@remote-dom/react` library](https://github.com/Shopify/remote-dom/blob/main/packages/react#remoterenderer)
 * uses this receiver to map remote elements to React components.
 */
export class RemoteReceiver {
  /**
   * Represents the root node of the remote tree. This node is always defined,
   * and you will likely be most interested in its `children` property, which
   * contains the top-level elements of the remote tree.
   */
  readonly root: RemoteReceiverRoot = {
    id: ROOT_ID,
    type: NODE_TYPE_ROOT,
    children: [],
    version: 0,
    properties: {},
    attributes: {},
    eventListeners: {},
  };

  /**
   * An object that can synchronize a tree of elements between two JavaScript
   * environments. This object acts as a “thin waist”, allowing for efficient
   * communication of changes between a “remote” environment (usually, a JavaScript
   * sandbox, such as an `iframe` or Web Worker) and a “host” environment
   * (usually, a top-level browser page).
   */
  readonly connection: RemoteConnection;

  private readonly attached = new Map<
    string | typeof ROOT_ID,
    RemoteReceiverNodeOrRoot
  >([[ROOT_ID, this.root]]);

  private readonly subscribers = new Map<
    string | typeof ROOT_ID,
    Set<(value: RemoteReceiverNodeOrRoot) => void>
  >();

  private readonly parents = new Map<string, string | typeof ROOT_ID>();
  private readonly implementations = new Map<
    string,
    Record<string, (...args: unknown[]) => unknown>
  >();

  constructor({
    retain,
    release,
    methods,
  }: RemoteReceiverOptions & {
    /**
     * A set of [remote methods](https://github.com/Shopify/remote-dom/blob/main/packages/core#remotemethods)
     * that can be called on the root node of the remote tree. This is a convenience
     * option that replaces the need to call `implement()` on the root node.
     */
    methods?: Record<string, (...args: any[]) => any> | null;
  } = {}) {
    const {attached, parents, subscribers} = this;

    this.connection = createRemoteConnection({
      call: (id, method, ...args) => {
        const implementation = this.implementations.get(id);
        const implementationMethod = implementation?.[method];

        if (typeof implementationMethod !== 'function') {
          throw new Error(
            `Node ${id} does not implement the ${method}() method`,
          );
        }

        return implementationMethod(...args);
      },
      insertChild: (parentId, child, nextSiblingId) => {
        const parent = attached.get(parentId) as Writable<RemoteReceiverParent>;
        const children = parent.children as Writable<RemoteReceiverNode[]>;
        const normalizedChild = attach(child, parent);

        if (nextSiblingId === undefined) {
          children.push(normalizedChild);
        } else {
          const sibling = attached.get(nextSiblingId) as RemoteReceiverNode;
          children.splice(children.indexOf(sibling), 0, normalizedChild);
        }

        parent.version += 1;
        this.parents.set(child.id, parent.id);

        runSubscribers(parent);
      },
      removeChild: (parentId, id) => {
        const parent = attached.get(parentId) as Writable<RemoteReceiverParent>;
        const children = parent.children as Writable<RemoteReceiverNode[]>;

        const node = attached.get(id) as Writable<RemoteReceiverNode>;
        const index = parent.children.indexOf(node);

        const [removed] = children.splice(index, 1);

        if (!removed) {
          return;
        }

        parent.version += 1;

        runSubscribers(parent);

        detach(removed);
      },
      updateProperty: (
        id,
        property,
        value,
        type = UPDATE_PROPERTY_TYPE_PROPERTY,
      ) => {
        const element = attached.get(id) as Writable<RemoteReceiverElement>;

        retain?.(value);

        let updateObject: Record<string, any>;

        switch (type) {
          case UPDATE_PROPERTY_TYPE_PROPERTY:
            updateObject = element.properties;
            break;
          case UPDATE_PROPERTY_TYPE_ATTRIBUTE:
            updateObject = element.attributes;
            break;
          case UPDATE_PROPERTY_TYPE_EVENT_LISTENER:
            updateObject = element.eventListeners;
            break;
        }

        const oldValue = updateObject[property];

        updateObject[property] = value;
        element.version += 1;

        let parentForUpdate: Writable<RemoteReceiverParent> | undefined;

        // If the slot changes, inform parent nodes so they can
        // re-parent it appropriately.
        if (property === 'slot') {
          const parentId = this.parents.get(id);

          parentForUpdate =
            parentId == null
              ? parentId
              : (attached.get(parentId) as Writable<RemoteReceiverParent>);

          if (parentForUpdate) {
            parentForUpdate.version += 1;
          }
        }

        runSubscribers(element);
        if (parentForUpdate) runSubscribers(parentForUpdate);

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id) as Writable<RemoteReceiverText>;

        text.data = newText;
        text.version += 1;

        runSubscribers(text);
      },
    });

    if (methods) this.implement(this.root, methods);

    function runSubscribers(attached: RemoteReceiverNodeOrRoot) {
      const subscribed = subscribers.get(attached.id);

      if (subscribed) {
        for (const subscriber of subscribed) {
          subscriber(attached);
        }
      }
    }

    function attach(
      child: RemoteNodeSerialization,
      parent: RemoteReceiverParent,
    ): RemoteReceiverNode {
      let normalizedChild: RemoteReceiverNode;

      switch (child.type) {
        case NODE_TYPE_TEXT:
        case NODE_TYPE_COMMENT: {
          const {id, type, data} = child;

          normalizedChild = {
            id,
            type,
            data,
            version: 0,
          } satisfies RemoteReceiverText | RemoteReceiverComment;

          break;
        }
        case NODE_TYPE_ELEMENT: {
          const {
            id,
            type,
            element,
            children,
            properties,
            attributes,
            eventListeners,
          } = child;
          retain?.(properties);
          retain?.(eventListeners);

          const resolvedChildren: RemoteReceiverNode[] = [];

          normalizedChild = {
            id,
            type,
            element,
            version: 0,
            children: resolvedChildren as readonly RemoteReceiverNode[],
            properties: {...properties},
            attributes: {...attributes},
            eventListeners: {...eventListeners},
          } satisfies RemoteReceiverElement;

          for (const grandChild of children) {
            resolvedChildren.push(attach(grandChild, normalizedChild));
          }

          break;
        }
        default: {
          throw new Error(`Unknown node type: ${JSON.stringify(child)}`);
        }
      }

      attached.set(normalizedChild.id, normalizedChild);
      parents.set(normalizedChild.id, parent.id);

      return normalizedChild;
    }

    function detach(child: RemoteReceiverNode) {
      attached.delete(child.id);
      parents.delete(child.id);

      if (release) {
        if ('properties' in child) release(child.properties);
        if ('eventListeners' in child) release(child.eventListeners);
      }

      if ('children' in child) {
        for (const grandChild of child.children) {
          detach(grandChild);
        }
      }
    }
  }

  /**
   * Fetches the latest state of a remote element that has been
   * received from the remote environment.
   *
   * @param node The remote node to fetch.
   * @returns The current state of the remote node, or `undefined` if the node is not connected to the remote tree.
   *
   * @example
   * import {RemoteReceiver} from '@remote-dom/core/receivers';
   *
   * const receiver = new RemoteReceiver();
   *
   * receiver.get(receiver.root) === receiver.root; // true
   */
  get<T extends RemoteReceiverNodeOrRoot>({id}: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }

  /**
   * Lets you define how [remote methods](https://github.com/Shopify/remote-dom/blob/main/packages/core#remotemethods)
   * are implemented for a particular element in the tree.
   *
   * @param node The remote node to subscribe for changes.
   * @param implementation A record containing the methods to expose for the passed node.
   *
   * @example
   * // In the host environment:
   * import {RemoteReceiver} from '@remote-dom/core/receivers';
   *
   * const receiver = new RemoteReceiver();
   *
   * receiver.implement(receiver.root, {
   *   alert(message) {
   *     window.alert(message);
   *   },
   * });
   *
   * // In the remote environment:
   * import {RemoteRootElement} from '@remote-dom/core/elements';
   *
   * customElements.define('remote-root', RemoteRootElement);
   *
   * const root = document.createElement('remote-root');
   * root.connect(receiver.connection);
   *
   * root.callRemoteMethod('alert', 'Hello, world!');
   */
  implement<T extends RemoteReceiverNodeOrRoot>(
    {id}: Pick<T, 'id'>,
    implementation?: Record<string, (...args: any[]) => any> | null,
  ) {
    if (implementation == null) {
      this.implementations.delete(id);
    } else {
      this.implementations.set(id, implementation);
    }
  }

  /**
   * Allows you to subscribe to changes in a remote element. This includes
   * changes to the remote element’s properties and list of children, but
   * note that you will not receive updates for properties or children of
   * _nested_ elements.
   *
   * @param node The remote node to subscribe for changes.
   * @param subscriber A function that will be called with the updated node on each change.
   *
   * @example
   * import {RemoteReceiver} from '@remote-dom/core/receivers';
   *
   * const abort = new AbortController();
   * const receiver = new RemoteReceiver();
   *
   * // Subscribe to all changes in the top-level children, attached
   * // directly to the remote “root”.
   * receiver.subscribe(
   *   receiver.root,
   *   (root) => {
   *     console.log('Root changed!', root);
   *   },
   *   {signal: abort.signal},
   * );
   */
  subscribe<T extends RemoteReceiverNodeOrRoot>(
    {id}: Pick<T, 'id'>,
    subscriber: (value: T) => void,
    {
      signal,
    }: {
      /**
       * An optional `AbortSignal` that can be used to unsubscribe from the changes.
       */
      signal?: AbortSignal;
    } = {},
  ) {
    let subscribersSet = this.subscribers.get(id);

    if (subscribersSet == null) {
      subscribersSet = new Set();
      this.subscribers.set(id, subscribersSet);
    }

    subscribersSet.add(subscriber as any);

    signal?.addEventListener('abort', () => {
      subscribersSet!.delete(subscriber as any);

      if (subscribersSet!.size === 0) {
        this.subscribers.delete(id);
      }
    });
  }
}

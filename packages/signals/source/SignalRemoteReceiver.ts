import {signal, batch, type ReadonlySignal} from '@preact/signals-core';

import {
  ROOT_ID,
  NODE_TYPE_ROOT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_TEXT,
  createRemoteConnection,
  type RemoteConnection,
  type RemoteNodeSerialization,
  type RemoteTextSerialization,
  type RemoteCommentSerialization,
  type RemoteElementSerialization,
} from '@remote-dom/core';
import type {RemoteReceiverOptions} from '@remote-dom/core/receivers';

/**
 * Represents a text node of a remote tree in a plain JavaScript format, with
 * the text content (the `data` property) wrapped in a signal.
 */
export interface SignalRemoteReceiverText
  extends Omit<RemoteTextSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteTextSerialization['data']>;
}

/**
 * Represents a comment node of a remote tree in a plain JavaScript format, with
 * the text content (the `data` property) wrapped in a signal.
 */
export interface SignalRemoteReceiverComment
  extends Omit<RemoteCommentSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteCommentSerialization['data']>;
}

/**
 * Represents an element node of a remote tree in a plain JavaScript format, with
 * the `properties` and `children` properties each wrapped in a signal.
 */
export interface SignalRemoteReceiverElement
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: ReadonlySignal<
    NonNullable<RemoteElementSerialization['properties']>
  >;
  readonly children: ReadonlySignal<readonly SignalRemoteReceiverNode[]>;
}

/**
 * Represents the root of a remote tree in a plain JavaScript format, with
 * the `properties` and `children` properties each wrapped in a signal.
 */
export interface SignalRemoteReceiverRoot {
  readonly id: typeof ROOT_ID;
  readonly type: typeof NODE_TYPE_ROOT;
  readonly properties: ReadonlySignal<
    NonNullable<RemoteElementSerialization['properties']>
  >;
  readonly children: ReadonlySignal<readonly SignalRemoteReceiverNode[]>;
}

/**
 * Represents any node that can be stored in the host representation of the remote tree.
 */
export type SignalRemoteReceiverNode =
  | SignalRemoteReceiverText
  | SignalRemoteReceiverComment
  | SignalRemoteReceiverElement;
export type SignalRemoteReceiverNodeOrRoot =
  | SignalRemoteReceiverNode
  | SignalRemoteReceiverRoot;
export type SignalRemoteReceiverParent =
  | SignalRemoteReceiverElement
  | SignalRemoteReceiverRoot;

/**
 * A `SignalRemoteReceiver` stores remote elements into a basic JavaScript representation,
 * with mutable properties and children stored in signals. This representation allows
 * for fine-grained subscriptions and computed values based on the contents of the remote
 * tree. This custom receiver is used by the the [`@remote-dom/preact` library](https://github.com/Shopify/remote-dom/blob/main/packages/preact#remoterenderer)
 * in order to map the remote tree to Preact components.
 */
export class SignalRemoteReceiver {
  /**
   * Represents the root node of the remote tree. This node is always defined,
   * and you will likely be most interested in its `children` property, which
   * contains the top-level elements of the remote tree.
   */
  readonly root: SignalRemoteReceiverRoot = {
    id: ROOT_ID,
    type: NODE_TYPE_ROOT,
    properties: signal({}),
    children: signal([]),
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
    SignalRemoteReceiverNodeOrRoot
  >([[ROOT_ID, this.root]]);

  private readonly parents = new Map<string, string | typeof ROOT_ID>();
  private readonly implementations = new Map<
    string,
    Record<string, (...args: unknown[]) => unknown>
  >();

  constructor({retain, release}: RemoteReceiverOptions = {}) {
    const {attached, parents} = this;

    const baseConnection = createRemoteConnection({
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
      insertChild: (id, child, index) => {
        const parent = attached.get(id) as SignalRemoteReceiverParent;
        const newChildren = [...parent.children.peek()];

        const normalizedChild = attach(child, parent);

        if (index === newChildren.length) {
          newChildren.push(normalizedChild);
        } else {
          newChildren.splice(index, 0, normalizedChild);
        }

        (parent.children as any).value = newChildren;
      },
      removeChild: (id, index) => {
        const parent = attached.get(id) as SignalRemoteReceiverParent;

        const newChildren = [...parent.children.peek()];

        const [removed] = newChildren.splice(index, 1);

        (parent.children as any).value = newChildren;

        detach(removed!);
      },
      updateProperty: (id, property, value) => {
        const element = attached.get(id) as SignalRemoteReceiverElement;
        const oldProperties = element.properties.peek();
        const oldValue = oldProperties[property];

        if (Object.is(oldValue, value)) return;

        retain?.(value);

        const newProperties = {...oldProperties};
        newProperties[property] = value;
        (element.properties as any).value = newProperties;

        // If the slot changes, inform parent nodes so they can
        // re-parent it appropriately.
        if (property === 'slot') {
          const parentId = this.parents.get(id);

          const parent =
            parentId == null
              ? parentId
              : (attached.get(parentId) as SignalRemoteReceiverParent);

          if (parent) {
            (parent.children as any).value = [...parent.children.peek()];
          }
        }

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id) as SignalRemoteReceiverText;
        (text.data as any).value = newText;
      },
    });

    this.connection = {
      call: baseConnection.call,
      mutate(records) {
        batch(() => {
          baseConnection.mutate(records);
        });
      },
    };

    function attach(
      child: RemoteNodeSerialization,
      parent: SignalRemoteReceiverParent,
    ): SignalRemoteReceiverNode {
      let normalizedChild: SignalRemoteReceiverNode;

      switch (child.type) {
        case NODE_TYPE_TEXT:
        case NODE_TYPE_COMMENT: {
          const {id, type, data} = child;

          normalizedChild = {
            id,
            type,
            data: signal(data),
          } satisfies SignalRemoteReceiverText | SignalRemoteReceiverComment;

          break;
        }
        case NODE_TYPE_ELEMENT: {
          const {id, type, element, children, properties} = child;
          retain?.(properties);

          const resolvedChildren: SignalRemoteReceiverNode[] = [];

          normalizedChild = {
            id,
            type,
            element,
            children: signal(
              resolvedChildren as readonly SignalRemoteReceiverNode[],
            ),
            properties: signal(properties ?? {}),
          } satisfies SignalRemoteReceiverElement;

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

    function detach(child: SignalRemoteReceiverNode) {
      attached.delete(child.id);
      parents.delete(child.id);

      if (release && 'properties' in child) {
        release(child.properties.peek());
      }

      if ('children' in child) {
        for (const grandChild of child.children.peek()) {
          detach(grandChild);
        }
      }
    }
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
   * import {SignalRemoteReceiver} from '@remote-dom/signals';
   *
   * const receiver = new SignalRemoteReceiver();
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
  implement<T extends SignalRemoteReceiverNodeOrRoot>(
    {id}: Pick<T, 'id'>,
    implementation?: Record<string, (...args: unknown[]) => unknown> | null,
  ) {
    if (implementation == null) {
      this.implementations.delete(id);
    } else {
      this.implementations.set(id, implementation);
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
   * import {SignalRemoteReceiver} from '@remote-dom/signals';
   *
   * const receiver = new SignalRemoteReceiver();
   *
   * receiver.get(receiver.root) === receiver.root; // true
   */
  get<T extends SignalRemoteReceiverNodeOrRoot>({
    id,
  }: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }
}

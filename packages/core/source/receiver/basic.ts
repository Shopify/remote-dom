import {createRemoteConnection, type RemoteConnection} from '../connection.ts';
import {
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_ROOT,
  NODE_TYPE_TEXT,
  ROOT_ID,
} from '../constants.ts';
import type {
  RemoteTextSerialization,
  RemoteCommentSerialization,
  RemoteElementSerialization,
  RemoteNodeSerialization,
} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

export interface RemoteReceiverText extends RemoteTextSerialization {
  readonly version: number;
}

export interface RemoteReceiverComment extends RemoteCommentSerialization {
  readonly version: number;
}

export interface RemoteReceiverElement
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: NonNullable<RemoteElementSerialization['properties']>;
  readonly children: readonly RemoteReceiverNode[];
  readonly version: number;
}

export interface RemoteReceiverRoot {
  readonly id: typeof ROOT_ID;
  readonly type: typeof NODE_TYPE_ROOT;
  readonly children: readonly RemoteReceiverNode[];
  readonly properties: NonNullable<RemoteElementSerialization['properties']>;
  readonly version: number;
}

export type RemoteReceiverNode =
  | RemoteReceiverText
  | RemoteReceiverComment
  | RemoteReceiverElement;
export type RemoteReceiverParent = RemoteReceiverElement | RemoteReceiverRoot;
type RemoteReceiverNodeOrRoot = RemoteReceiverNode | RemoteReceiverRoot;

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export class RemoteReceiver {
  readonly root: RemoteReceiverRoot = {
    id: ROOT_ID,
    type: NODE_TYPE_ROOT,
    children: [],
    version: 0,
    properties: {},
  };

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

  readonly connection: RemoteConnection;

  constructor({
    retain,
    release,
    methods,
  }: RemoteReceiverOptions & {
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
      insertChild: (id, child, index) => {
        const parent = attached.get(id) as Writable<RemoteReceiverParent>;

        const {children} = parent;

        const normalizedChild = attach(child, parent);

        if (index === children.length) {
          (children as Writable<typeof children>).push(normalizedChild);
        } else {
          (children as Writable<typeof children>).splice(
            index,
            0,
            normalizedChild,
          );
        }

        parent.version += 1;
        this.parents.set(child.id, parent.id);

        runSubscribers(parent);
      },
      removeChild: (id, index) => {
        const parent = attached.get(id) as Writable<RemoteReceiverParent>;

        const {children} = parent;

        const [removed] = (children as Writable<typeof children>).splice(
          index,
          1,
        );
        parent.version += 1;

        runSubscribers(parent);

        detach(removed!);
      },
      updateProperty: (id, property, value) => {
        const element = attached.get(id) as Writable<RemoteReceiverElement>;

        retain?.(value);

        const oldValue = element.properties[property];

        element.properties[property] = value;
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
          const {id, type, element, children, properties} = child;
          retain?.(properties);

          const resolvedChildren: RemoteReceiverNode[] = [];

          normalizedChild = {
            id,
            type,
            element,
            version: 0,
            children: resolvedChildren as readonly RemoteReceiverNode[],
            properties: {...properties},
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

      if (release && 'properties' in child) {
        release(child.properties);
      }

      if ('children' in child) {
        for (const grandChild of child.children) {
          detach(grandChild);
        }
      }
    }
  }

  get<T extends RemoteReceiverNodeOrRoot>({id}: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }

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

  subscribe<T extends RemoteReceiverNodeOrRoot>(
    {id}: Pick<T, 'id'>,
    subscriber: (value: T) => void,
    {signal}: {signal?: AbortSignal} = {},
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

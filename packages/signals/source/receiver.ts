import {signal, type ReadonlySignal} from '@preact/signals-core';

import {
  ROOT_ID,
  NODE_TYPE_ROOT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_TEXT,
  createRemoteMutationCallback,
  type RemoteMutationCallback,
  type RemoteNodeSerialization,
  type RemoteTextSerialization,
  type RemoteCommentSerialization,
  type RemoteElementSerialization,
} from '@remote-dom/core';
import type {RemoteReceiverOptions} from '@remote-dom/core/receiver';

export interface SignalRemoteReceiverText
  extends Omit<RemoteTextSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteTextSerialization['data']>;
}

export interface SignalRemoteReceiverComment
  extends Omit<RemoteCommentSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteCommentSerialization['data']>;
}

export interface SignalRemoteReceiverElement
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: ReadonlySignal<
    NonNullable<RemoteElementSerialization['properties']>
  >;
  readonly children: ReadonlySignal<readonly SignalRemoteReceiverNode[]>;
}

export interface SignalRemoteReceiverRoot {
  readonly id: typeof ROOT_ID;
  readonly type: typeof NODE_TYPE_ROOT;
  readonly children: ReadonlySignal<readonly SignalRemoteReceiverNode[]>;
}

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

export class SignalRemoteReceiver {
  readonly root: SignalRemoteReceiverRoot = {
    id: ROOT_ID,
    type: NODE_TYPE_ROOT,
    children: signal([]),
  };

  private readonly attached = new Map<
    string | typeof ROOT_ID,
    SignalRemoteReceiverNodeOrRoot
  >([[ROOT_ID, this.root]]);

  private readonly parents = new Map<string, string | typeof ROOT_ID>();

  readonly receive: RemoteMutationCallback;

  get callback() {
    return this.receive;
  }

  constructor({retain, release}: RemoteReceiverOptions = {}) {
    const {attached, parents} = this;

    this.receive = createRemoteMutationCallback({
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

  get<T extends SignalRemoteReceiverNodeOrRoot>({
    id,
  }: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }
}

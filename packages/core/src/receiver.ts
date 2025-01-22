import {retain, release} from '@remote-ui/rpc';

import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_ROOT,
} from './types';
import type {
  ActionArgumentMap,
  RemoteChannel,
  RemoteTextSerialization,
  RemoteComponentSerialization,
  RemoteFragmentSerialization,
} from './types';
import {isRemoteFragment} from './utilities';

export const ROOT_ID = Symbol('RootId');

export interface RemoteReceiverAttachableText extends RemoteTextSerialization {
  version: number;
}

export interface RemoteReceiverAttachableComponent
  extends Omit<RemoteComponentSerialization<any>, 'children'> {
  children: RemoteReceiverAttachableChild[];
  version: number;
}

export interface RemoteReceiverAttachableFragment
  extends Omit<RemoteFragmentSerialization, 'children'> {
  children: RemoteReceiverAttachableChild[];
  version: number;
}

export interface RemoteReceiverAttachableRoot {
  id: typeof ROOT_ID;
  kind: typeof KIND_ROOT;
  children: RemoteReceiverAttachableChild[];
  version: number;
}

export type RemoteReceiverAttachableChild =
  | RemoteReceiverAttachableText
  | RemoteReceiverAttachableComponent;

export type RemoteReceiverAttachable =
  | RemoteReceiverAttachableChild
  | RemoteReceiverAttachableRoot
  | RemoteReceiverAttachableFragment;

interface RemoteChannelRunner {
  mount(...args: ActionArgumentMap[typeof ACTION_MOUNT]): void;
  insertChild(...args: ActionArgumentMap[typeof ACTION_INSERT_CHILD]): void;
  removeChild(...args: ActionArgumentMap[typeof ACTION_INSERT_CHILD]): void;
  updateProps(...args: ActionArgumentMap[typeof ACTION_UPDATE_PROPS]): void;
  updateText(...args: ActionArgumentMap[typeof ACTION_UPDATE_TEXT]): void;
}

export function createRemoteChannel({
  mount,
  insertChild,
  removeChild,
  updateProps,
  updateText,
}: RemoteChannelRunner): RemoteChannel {
  const messageMap = new Map<keyof ActionArgumentMap, (...args: any[]) => any>([
    [ACTION_MOUNT, mount],
    [ACTION_REMOVE_CHILD, removeChild],
    [ACTION_INSERT_CHILD, insertChild],
    [ACTION_UPDATE_PROPS, updateProps],
    [ACTION_UPDATE_TEXT, updateText],
  ]);

  return (type, ...args) => messageMap.get(type)!(...args);
}

export interface RemoteReceiverAttachment {
  readonly root: RemoteReceiverAttachableRoot;
  get<T extends RemoteReceiverAttachable>(attachable: Pick<T, 'id'>): T | null;
  subscribe<T extends RemoteReceiverAttachable>(
    {id}: T,
    subscriber: (value: T) => void,
  ): () => void;
}

export interface RemoteReceiver {
  readonly receive: RemoteChannel;
  readonly attached: RemoteReceiverAttachment;
  readonly state: 'mounted' | 'unmounted';
  on(event: 'mount', handler: () => void): () => void;
  flush(): Promise<void>;
}

export function createRemoteReceiver(): RemoteReceiver {
  const queuedUpdates = new Set<RemoteReceiverAttachable>();
  const listeners = new Map<
    Parameters<RemoteReceiver['on']>[0],
    Set<Parameters<RemoteReceiver['on']>[1]>
  >();

  const attachmentSubscribers = new Map<
    string | typeof ROOT_ID,
    Set<(value: RemoteReceiverAttachable) => void>
  >();

  let timeout: Promise<void> | null = null;
  let state: RemoteReceiver['state'] = 'unmounted';

  const root: RemoteReceiverAttachableRoot = {
    id: ROOT_ID,
    kind: KIND_ROOT,
    children: [],
    version: 0,
  };

  const attachedNodes = new Map<
    string | typeof ROOT_ID,
    RemoteReceiverAttachable
  >([[ROOT_ID, root]]);

  const receive = createRemoteChannel({
    mount: (children) => {
      const root = attachedNodes.get(ROOT_ID) as RemoteReceiverAttachableRoot;

      const normalizedChildren = children.map((child) =>
        normalizeNode(child, addVersion),
      );

      root.version += 1;
      root.children = normalizedChildren;

      state = 'mounted';

      for (const child of normalizedChildren) {
        retain(child);
        attach(child);
      }

      // eslint-disable-next-line promise/catch-or-return
      enqueueUpdate(root).then(() => {
        emit('mount');
      });
    },
    insertChild: (id, index, child, existingId) => {
      const attached = attachedNodes.get(
        id ?? ROOT_ID,
      ) as RemoteReceiverAttachableRoot;
      const {children} = attached;

      let existingAttached: RemoteReceiverAttachableRoot | undefined;
      let normalizedChild: RemoteReceiverAttachableChild;

      if (id === existingId) {
        existingAttached = attached;
      } else if (existingId !== false) {
        existingAttached = attachedNodes.get(
          existingId ?? ROOT_ID,
        ) as RemoteReceiverAttachableRoot;
      }

      if (existingAttached) {
        const childId = child.id;
        const existingChildren = existingAttached.children;
        const existingIndex = existingChildren.findIndex(
          (child) => child.id === childId,
        );

        const [removed] = existingChildren.splice(existingIndex, 1);

        normalizedChild = removed;

        // If we are just moving the child to a different index in the same node,
        // we don’t need to enqueue an update, because that will be done for this
        // node below.
        if (id !== existingId) {
          existingAttached.version += 1;
          enqueueUpdate(existingAttached);
        }
      } else {
        normalizedChild = normalizeNode(child, addVersion);
        retain(normalizedChild);
        attach(normalizedChild);
      }

      if (index === children.length) {
        children.push(normalizedChild);
      } else {
        children.splice(index, 0, normalizedChild);
      }

      attached.version += 1;
      enqueueUpdate(attached);
    },
    removeChild: (id, index) => {
      const attached = attachedNodes.get(
        id ?? ROOT_ID,
      ) as RemoteReceiverAttachableRoot;

      const {children} = attached;
      const [removed] = children.splice(index, 1);
      if (!removed) {
        return;
      }
      attached.version += 1;

      detach(removed);

      // eslint-disable-next-line promise/catch-or-return
      enqueueUpdate(attached).then(() => {
        release(removed);
      });
    },
    updateProps: (id, newProps) => {
      const component = attachedNodes.get(
        id,
      ) as RemoteReceiverAttachableComponent;

      const oldProps = {...(component.props as any)};

      retain(newProps);

      Object.keys(newProps).forEach((key) => {
        const newProp = (newProps as any)[key];
        const oldProp = (oldProps as any)[key];
        if (isRemoteReceiverAttachableFragment(oldProp)) {
          detach(oldProp);
        }
        if (isRemoteFragmentSerialization(newProp)) {
          const attachableNewProp = normalizeNode(newProp, addVersion);
          attach(attachableNewProp);
        }
      });

      Object.assign(component.props as any, newProps);
      component.version += 1;

      // eslint-disable-next-line promise/catch-or-return
      enqueueUpdate(component).then(() => {
        for (const key of Object.keys(newProps)) {
          release((oldProps as any)[key]);
        }
      });
    },
    updateText: (id, newText) => {
      const text = attachedNodes.get(id) as RemoteReceiverAttachableText;

      text.text = newText;
      text.version += 1;
      enqueueUpdate(text);
    },
  });

  return {
    get state() {
      return state;
    },
    receive,
    attached: {
      root,
      get({id}) {
        return (attachedNodes.get(id) as any) ?? null;
      },
      subscribe({id}, subscriber) {
        let subscribers = attachmentSubscribers.get(id);

        if (subscribers == null) {
          subscribers = new Set();
          attachmentSubscribers.set(id, subscribers);
        }

        subscribers.add(subscriber as any);

        return () => {
          const subscribers = attachmentSubscribers.get(id);

          if (subscribers) {
            subscribers.delete(subscriber as any);

            if (subscribers.size === 0) {
              attachmentSubscribers.delete(id);
            }
          }
        };
      },
    },
    flush,
    on(event, listener) {
      let listenersForEvent = listeners.get(event);

      if (listenersForEvent == null) {
        listenersForEvent = new Set();
        listeners.set(event, listenersForEvent);
      }

      listenersForEvent.add(listener);

      return () => {
        const listenersForEvent = listeners.get(event);

        if (listenersForEvent) {
          listenersForEvent.delete(listener);

          if (listenersForEvent.size === 0) {
            listeners.delete(event);
          }
        }
      };
    },
  };

  function flush() {
    return timeout ?? Promise.resolve();
  }

  function emit(event: 'mount') {
    const listenersForEvent = listeners.get(event);

    if (listenersForEvent) {
      for (const listener of listenersForEvent) {
        listener();
      }
    }
  }

  function enqueueUpdate(attached: RemoteReceiverAttachable) {
    timeout =
      timeout ??
      new Promise((resolve) => {
        setTimeout(() => {
          const attachedToUpdate = [...queuedUpdates];

          timeout = null;
          queuedUpdates.clear();

          for (const attached of attachedToUpdate) {
            const subscribers = attachmentSubscribers.get(attached.id);

            if (subscribers) {
              for (const subscriber of subscribers) {
                subscriber(attached);
              }
            }
          }

          resolve();
        }, 0);
      });

    queuedUpdates.add(attached);

    return timeout;
  }

  function attach(
    child: RemoteReceiverAttachableChild | RemoteReceiverAttachableFragment,
  ) {
    attachedNodes.set(child.id, child);

    if (child.kind === KIND_COMPONENT && 'props' in child) {
      const {props = {}} = child as any;
      Object.keys(props).forEach((key) => {
        const prop = props[key];
        if (!isRemoteReceiverAttachableFragment(prop)) return;
        attach(prop);
      });
    }

    if ('children' in child) {
      for (const grandChild of child.children) {
        attach(grandChild);
      }
    }
  }

  function detach(
    child: RemoteReceiverAttachableChild | RemoteReceiverAttachableFragment,
  ) {
    attachedNodes.delete(child.id);

    if (child.kind === KIND_COMPONENT && 'props' in child) {
      const {props = {}} = child as any;
      Object.keys(props).forEach((key) => {
        const prop = props[key];
        if (!isRemoteReceiverAttachableFragment(prop)) return;
        detach(prop);
      });
    }

    if ('children' in child) {
      for (const grandChild of child.children) {
        detach(grandChild);
      }
    }
  }
}

function addVersion<T>(
  value: T,
): T extends RemoteTextSerialization
  ? RemoteReceiverAttachableText
  : T extends RemoteComponentSerialization
  ? RemoteReceiverAttachableChild
  : T extends RemoteFragmentSerialization
  ? RemoteReceiverAttachableFragment
  : never {
  (value as any).version = 0;
  return value as any;
}

function normalizeNode<
  T extends
    | RemoteTextSerialization
    | RemoteComponentSerialization
    | RemoteFragmentSerialization,
  R,
>(node: T, normalizer: (node: T) => R) {
  if (node.kind === KIND_FRAGMENT || node.kind === KIND_COMPONENT) {
    (node as any).children.forEach((child: T) =>
      normalizeNode(child, normalizer),
    );
  }
  if (node.kind === KIND_COMPONENT && 'props' in node) {
    const {props} = node as any;
    for (const key of Object.keys(props)) {
      const prop = props[key];
      if (!isRemoteFragmentSerialization(prop)) continue;
      props[key] = normalizeNode(prop as any, normalizer);
    }
  }
  return normalizer(node);
}

export function isRemoteFragmentSerialization(
  object: unknown,
): object is RemoteFragmentSerialization {
  return isRemoteFragment(object) && 'id' in object && 'children' in object;
}

export function isRemoteReceiverAttachableFragment(
  object: unknown,
): object is RemoteReceiverAttachableFragment {
  return isRemoteFragmentSerialization(object) && 'version' in object;
}

import {retain, release} from '@remote-ui/rpc';
import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
} from './types';
import type {
  ActionArgumentMap,
  RemoteChannel,
  RemoteTextSerialization,
  RemoteComponentSerialization,
} from './types';

export const ROOT_ID = Symbol('RootId');

export interface RemoteReceiverAttachableText extends RemoteTextSerialization {
  version: number;
}

export interface RemoteReceiverAttachableComponent
  extends Omit<RemoteComponentSerialization<any>, 'children'> {
  children: RemoteReceiverAttachableChild[];
  version: number;
}

export interface RemoteReceiverAttachableRoot {
  id: typeof ROOT_ID;
  children: RemoteReceiverAttachableChild[];
  version: number;
}

export type RemoteReceiverAttachableChild =
  | RemoteReceiverAttachableText
  | RemoteReceiverAttachableComponent;

export type RemoteReceiverAttachable =
  | RemoteReceiverAttachableChild
  | RemoteReceiverAttachableRoot;

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
  const messageMap = new Map<number, Function>([
    [ACTION_MOUNT, mount],
    [ACTION_REMOVE_CHILD, removeChild],
    [ACTION_INSERT_CHILD, insertChild],
    [ACTION_UPDATE_PROPS, updateProps],
    [ACTION_UPDATE_TEXT, updateText],
  ]);

  return (type, ...args) => (messageMap.get(type) as any)(...args);
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
  addSubReceiver(receiver: RemoteReceiver): () => void;
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
    children: [],
    version: 0,
  };

  const attachedNodes = new Map<
    string | typeof ROOT_ID,
    RemoteReceiverAttachable
  >([[ROOT_ID, root]]);

  const subReceivers = new Set<RemoteReceiver>();
  const addSubReceiver: RemoteReceiver['addSubReceiver'] = (receiver) => {
    subReceivers.add(receiver);
    return () => {
      subReceivers.delete(receiver);
    };
  };
  const forwardToSubReceiver: RemoteReceiver['receive'] = (type, ...args) => {
    subReceivers.forEach((receiver) => receiver.receive(type, ...args));
  };

  const receive = createRemoteChannel({
    mount: (children) => {
      const root = attachedNodes.get(ROOT_ID) as RemoteReceiverAttachableRoot;

      const normalizedChildren = children.map(addVersion);

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
    insertChild: (id, index, child) => {
      const attached = attachedNodes.get(
        id ?? ROOT_ID,
      ) as RemoteReceiverAttachableRoot;
      if (!attached) {
        forwardToSubReceiver(ACTION_INSERT_CHILD, id, index, child);
        return;
      }

      const normalizedChild = addVersion(child);
      retain(normalizedChild);
      attach(normalizedChild);

      const {children} = attached;

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
      if (!attached) {
        forwardToSubReceiver(ACTION_REMOVE_CHILD, id, index);
        return;
      }

      const {children} = attached;

      const [removed] = children.splice(index, 1);
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
      if (!component) {
        forwardToSubReceiver(ACTION_UPDATE_PROPS, id, newProps);
        return;
      }

      const oldProps = {...(component.props as any)};

      retain(newProps);

      Object.assign(component.props, newProps);
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
      if (!text) {
        forwardToSubReceiver(ACTION_UPDATE_TEXT, id, newText);
        return;
      }

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
    addSubReceiver,
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

  function attach(child: RemoteReceiverAttachableChild) {
    attachedNodes.set(child.id, child);

    if ('children' in child) {
      for (const grandChild of child.children) {
        attach(grandChild);
      }
    }
  }

  function detach(child: RemoteReceiverAttachableChild) {
    attachedNodes.delete(child.id);

    if ('children' in child) {
      for (const grandChild of child.children) {
        detach(grandChild);
      }
    }
  }
}

function addVersion(value: any): RemoteReceiverAttachableChild {
  (value as any).version = 0;
  return value as any;
}

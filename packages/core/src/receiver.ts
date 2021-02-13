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

export interface Text extends RemoteTextSerialization {
  version: number;
}

export interface Component
  extends Omit<RemoteComponentSerialization<any>, 'children'> {
  children: Child[];
  version: number;
}

type Child = Text | Component;

interface Root {
  id: typeof ROOT_ID;
  children: Child[];
  version: number;
}

type Attachable = Child | Root;

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
  readonly root: Root;
  get<T extends Attachable>(attachable: Pick<T, 'id'>): T | null;
  subscribe<T extends Attachable>(
    {id}: T,
    subscriber: (value: T) => void,
  ): () => void;
}

export interface RemoteReceiver {
  readonly receive: RemoteChannel;
  readonly attached: RemoteReceiverAttachment;
  readonly state: 'mounted' | 'unmounted';
  on(
    event: 'mount',
    handler: (details: {children: readonly Child[]}) => void,
  ): () => void;
  flush(): Promise<void>;
}

export function createRemoteReceiver(): RemoteReceiver {
  const queuedUpdates = new Set<Attachable>();
  const listeners = new Map<
    Parameters<RemoteReceiver['on']>[0],
    Set<Parameters<RemoteReceiver['on']>[1]>
  >();

  const attachmentSubscribers = new Map<
    string | typeof ROOT_ID,
    Set<(value: Attachable) => void>
  >();

  let timeout: Promise<void> | null = null;
  const state: RemoteReceiver['state'] = 'unmounted';

  const root: Root = {id: ROOT_ID, children: [], version: 0};
  const attachedNodes = new Map<string | typeof ROOT_ID, Attachable>([
    [ROOT_ID, root],
  ]);

  const receive = createRemoteChannel({
    mount: (children) => {
      const root = attachedNodes.get(ROOT_ID) as Root;

      const normalizedChildren = children.map(addVersion);

      root.version += 1;
      root.children = normalizedChildren;

      for (const child of normalizedChildren) {
        retain(child);
        attach(child);
      }

      enqueueUpdate(root);
    },
    insertChild: (id, index, child) => {
      const normalizedChild = addVersion(child);
      retain(normalizedChild);
      attach(normalizedChild);

      const attached = attachedNodes.get(id ?? ROOT_ID) as Root;
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
      const attached = attachedNodes.get(id ?? ROOT_ID) as Root;
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
      const component = attachedNodes.get(id) as Component;
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
      const text = attachedNodes.get(id) as Text;
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

  function enqueueUpdate(attached: Attachable) {
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

  function attach(child: Child) {
    attachedNodes.set(child.id, child);

    if ('children' in child) {
      for (const grandChild of child.children) {
        attach(grandChild);
      }
    }
  }

  function detach(child: Child) {
    attachedNodes.delete(child.id);

    if ('children' in child) {
      for (const grandChild of child.children) {
        detach(grandChild);
      }
    }
  }
}

function addVersion(value: any): Child {
  (value as any).version = 0;
  return value as any;
}

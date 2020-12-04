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

const ROOT_ID = Symbol('RootId');

type Child = RemoteTextSerialization | RemoteComponentSerialization<any>;

interface Root {
  id: typeof ROOT_ID;
  children: Child[];
}

type Attachable = Child | Root;

type UpdateListener<T extends Attachable> = (updated: T) => void;

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

export class RemoteReceiver {
  readonly root: Root = {id: ROOT_ID, children: []};

  readonly receive = createRemoteChannel({
    mount: (children) => {
      this.root.children = children;

      for (const child of children) {
        retain(child);
        this.attach(child);
      }

      this.enqueueUpdate(this.root);
    },
    insertChild: (id, index, child) => {
      retain(child);
      this.attach(child);
      const attached = this.attached.get(id ?? ROOT_ID) as Root;
      const children = [...attached.children];

      if (index === children.length) {
        children.push(child);
      } else {
        children.splice(index, 0, child);
      }

      attached.children = children;

      this.enqueueUpdate(attached);
    },
    removeChild: (id, index) => {
      const attached = this.attached.get(id ?? ROOT_ID) as Root;
      const children = [...attached.children];
      const [removed] = children.splice(index, 1);

      this.detach(removed);
      attached.children = children;

      // eslint-disable-next-line promise/catch-or-return
      this.enqueueUpdate(attached).then(() => {
        release(removed);
      });
    },
    updateProps: (id, newProps) => {
      const component = this.attached.get(id) as RemoteComponentSerialization;
      const {props: oldProps} = component;

      retain(newProps);

      const props = {...(component.props as any), ...newProps};
      component.props = props;

      // eslint-disable-next-line promise/catch-or-return
      this.enqueueUpdate(component).then(() => {
        for (const key of Object.keys(newProps)) {
          release((oldProps as any)[key]);
        }
      });
    },
    updateText: (id, newText) => {
      const text = this.attached.get(id) as RemoteTextSerialization;
      text.text = newText;
      this.enqueueUpdate(text);
    },
  });

  private attached = new Map<string | typeof ROOT_ID, Attachable>([
    [ROOT_ID, this.root],
  ]);

  private timeout: Promise<void> | null = null;
  private queuedUpdates = new Set<Attachable>();

  private readonly listeners = new Map<
    string | typeof ROOT_ID,
    Set<UpdateListener<any>>
  >();

  get<T extends Attachable>({id}: T): T | null {
    return (this.attached.get(id) as T | undefined) ?? null;
  }

  listen<T extends Attachable>({id}: T, listener: UpdateListener<T>) {
    let listeners: Set<UpdateListener<any>>;
    if (this.listeners.has(id)) {
      listeners = this.listeners.get(id)!;
    } else {
      listeners = new Set();
      this.listeners.set(id, listeners);
    }
    listeners.add(listener);

    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size) {
          this.listeners.set(id, listeners);
        } else {
          this.listeners.delete(id);
        }
      }
    };
  }

  flush() {
    return this.timeout ?? Promise.resolve();
  }

  private enqueueUpdate(attached: Attachable) {
    this.timeout =
      this.timeout ??
      new Promise((resolve) => {
        setTimeout(() => {
          const queuedUpdates = [...this.queuedUpdates];

          this.timeout = null;
          this.queuedUpdates.clear();

          for (const attached of queuedUpdates) {
            const listeners = this.listeners.get(
              attached === this.root ? ROOT_ID : attached.id,
            );

            if (listeners) {
              for (const listener of listeners) {
                listener(attached);
              }
            }
          }

          resolve();
        }, 0);
      });

    this.queuedUpdates.add(attached);

    return this.timeout;
  }

  private attach(child: Child) {
    this.attached.set(child.id, child);

    if ('children' in child) {
      for (const grandChild of child.children) {
        this.attach(grandChild);
      }
    }
  }

  private detach(child: Child) {
    this.attached.delete(child.id);

    if ('children' in child) {
      for (const grandChild of child.children) {
        this.detach(grandChild);
      }
    }
  }
}

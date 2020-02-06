import {retain, release} from '@shopify/remote-ui-rpc';
import {
  Action,
  MessageMap,
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

export class RemoteReceiver {
  readonly root: Root = {id: ROOT_ID, children: []};
  private attached = new Map<string | typeof ROOT_ID, Attachable>([
    [ROOT_ID, this.root],
  ]);

  private timeout: any;
  private queuedUpdates = new Set<Attachable>();

  private readonly listeners = new Map<
    string | typeof ROOT_ID,
    UpdateListener<any>
  >();

  readonly receive: RemoteChannel = (type, ...args) => {
    switch (type) {
      case Action.Mount: {
        const children = (args as MessageMap[Action.Mount])[0];

        this.root.children = children;

        for (const child of children) {
          retain(child);
          this.attach(child);
        }

        this.enqueueUpdate(this.root);

        break;
      }
      case Action.RemoveChild: {
        const [id = ROOT_ID, index] = args as MessageMap[Action.RemoveChild];

        const attached = this.attached.get(id) as Root;
        const children = [...attached.children];
        const [removed] = children.splice(index, 1);

        release(removed);
        this.detach(removed);
        attached.children = children;

        this.enqueueUpdate(this.root);

        break;
      }
      case Action.InsertChild: {
        const [
          id = ROOT_ID,
          index,
          child,
        ] = args as MessageMap[Action.InsertChild];

        retain(child);
        this.attach(child);
        const attached = this.attached.get(id) as Root;
        const children = [...attached.children];

        if (index === children.length) {
          children.push(child);
        } else {
          children.splice(index, 0, child);
        }

        attached.children = children;

        this.enqueueUpdate(attached);

        break;
      }
      case Action.UpdateProps: {
        const [id, newProps] = args as MessageMap[Action.UpdateProps];

        const component = this.attached.get(id) as RemoteComponentSerialization;
        const {props: oldProps} = component;

        retain(newProps);

        for (const key of Object.keys(newProps)) {
          release((oldProps as any)[key]);
        }

        const props = {...component.props, ...newProps};

        component.props = props;

        this.enqueueUpdate(component);

        break;
      }
      case Action.UpdateText: {
        const [id, newText] = args as MessageMap[Action.UpdateText];

        const text = this.attached.get(id) as RemoteTextSerialization;
        text.text = newText;

        const listener = this.listeners.get(id);

        if (listener) {
          listener(text);
        }

        break;
      }
    }
  };

  listen<T extends Attachable>({id}: T, listener: UpdateListener<T>) {
    this.listeners.set(id, listener);

    return () => {
      if (this.listeners.get(id) === listener) {
        this.listeners.delete(id);
      }
    };
  }

  private enqueueUpdate(attached: Attachable) {
    if (this.timeout == null) {
      this.timeout = setTimeout(() => {
        const queuedUpdates = [...this.queuedUpdates];

        this.timeout = null;
        this.queuedUpdates.clear();

        for (const attached of queuedUpdates) {
          const listener = this.listeners.get(
            attached === this.root ? ROOT_ID : attached.id,
          );

          listener?.(attached);
        }
      }, 0);
    }

    this.queuedUpdates.add(attached);
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

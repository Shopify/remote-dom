import {
  createRemoteConnection,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  RemoteCommentSerialization,
  RemoteConnection,
  RemoteElementSerialization,
  RemoteTextSerialization,
} from '@remote-dom/core';
import type {RemoteReceiverOptions} from '@remote-dom/core/receivers';
import {createElement, Fragment} from 'preact';

type AnyNodeType = Parameters<typeof createElement>[0];
type HostChild = HostNode | null | undefined;
type ComponentProps<T = any> = {
  [K in keyof T]: T[K];
} & {
  children: never;
};

interface PreactReceiverOptions extends RemoteReceiverOptions {
  rerender?(root: JSX.Element): void;
  components?: Map<string, AnyNodeType>;
}

function createHostNode(
  id: string,
  type: AnyNodeType,
  props: any = null,
  events?: string[],
  children?: any[],
) {
  return new HostNode(id, type, props || {}, events, children);
}

/**
 * Like a JSX Element or DOM Element, but it can be materialized to a (p)react JSX Element (recursively) via .resolved().
 * Mutations (append/remove/setProp) invalidate the node and its ancestors, causing the next resolved() to return new JSX Elements.
 * Unmodified (cached) nodes returned by resolved() get skipped by (p)react during re-renders.
 */
class HostNode<
  Type extends AnyNodeType = AnyNodeType,
  Props extends ComponentProps = any,
> {
  parent: HostNode | null = null;
  cache: JSX.Element | undefined;
  events: {[K: string]: true} = Object.create(null);
  exposed?: Record<string, (...args: any[]) => any>;
  api?: Record<string, (...args: any[]) => any>;
  isRoot = false;
  ref: {
    current?: Type extends keyof HTMLElementTagNameMap
      ? HTMLElementTagNameMap[Type]
      : Type extends new (...args: any) => any
        ? InstanceType<Type>
        : HTMLElement;
  } = {current: undefined};
  private boundEventHandlers: Record<string, (...args: any[]) => any> = {};

  // public dispatchEvent?: (target: string, event: Partial<Event>) => any;

  constructor(
    public id: string,
    public type: Type,
    public props: Props,
    events?: string[],
    public children?: HostChild[],
  ) {
    if (events) for (const type in events) this.events[type] = true;
  }

  resolved(): JSX.Element {
    if (this.cache !== undefined) return this.cache;
    const props: Record<string, any> = {
      ...this.props,
      key: this.id,
      ref: this.ref,
    };
    // event delegation
    for (const type in this.events) {
      const propName = 'on' + type[0]!.toUpperCase() + type.slice(1);
      props[propName] = this.createBoundHandler(type);
    }
    if (this.children) {
      for (const child of this.children) {
        const resolved =
          child == null || typeof child !== 'object' ? child : child.resolved();
        const slot = child?.props?.slot;
        if (slot && typeof slot === 'string') {
          props[slot] = resolved;
        } else {
          (props.children || (props.children = [])).push(resolved);
        }
      }
    }
    let vnode = createElement(this.type, props);
    this.cache = vnode;
    return vnode;
  }

  get isConnected(): boolean {
    return this.isRoot || (this.parent ? this.parent.isConnected : false);
  }

  get instance() {
    return this.api ?? this.ref.current;
  }

  // walk up the tree and remove cached resolved vnodes to carve re-rendering path
  private invalidate() {
    this.cache = undefined;
    if (this.parent) this.parent.invalidate();
  }

  private invalidateSubtree() {
    if (this.children) {
      for (const child of this.children) {
        child?.invalidateSubtree();
      }
    }
  }

  private setChildren(children: HostChild[]) {
    this.children = children;
    this.invalidate();
  }

  setProp<T extends keyof Props>(name: T, value: Props[T]) {
    const {props} = this;
    if (props[name] === value) return;
    props[name] = value;
    this.invalidate();
  }

  insertBefore(child: HostNode, before?: HostNode | null) {
    let children = this.children;
    if (children) {
      let index = before ? children.indexOf(before) : -1;
      if (index === -1) children.push(child);
      else children.splice(index, 0, child);
      this.setChildren(children);
    } else {
      this.setChildren([child]);
    }
    child.parent = this;
    Object.setPrototypeOf(child.events, this.events);
  }

  removeChild(child: HostNode) {
    let children = this.children;
    if (children) {
      let index = children.indexOf(child);
      // React's diff should be better using a null "hole":
      // if (index !== -1) children[index] = null;
      if (index !== -1) children.splice(index, 1);
      else throw Error(`remove(): node is not a child of this parent`);
      this.setChildren(children);
    }
    child.parent = null;
  }

  addEventListener(type: string) {
    const prev = type in this.events;
    this.events[type] = true;
    // event type already inherited
    if (!prev) return;
    this.invalidate();
    this.invalidateSubtree();
  }

  removeEventListener(type: string) {
    const prev = type in this.events;
    // event type was not set
    if (!prev) return;
    delete this.events[type];
    this.invalidate();
    this.invalidateSubtree();
  }

  private getRoot(): HostNode | undefined {
    return this.isRoot ? this : this.parent?.getRoot();
  }

  private createBoundHandler(type: string) {
    const cached = this.boundEventHandlers[type];
    if (cached) return cached;
    return (this.boundEventHandlers[type] = this.dispatchEvent.bind(
      this,
      type,
    ));
  }

  private dispatchEvent(type: string, evt: any) {
    const root = this.getRoot()!;
    const event: CustomEventInit = {
      detail: undefined as any,
      bubbles: true,
      cancelable: true,
    };
    if (evt instanceof Event) {
      if ('detail' in evt) {
        event.detail = evt.detail;
      }
      event.bubbles = evt.bubbles;
      event.cancelable = evt.cancelable;
    } else if (evt != null) {
      event.detail = evt;
    }
    // const ret = await this.connection.call(id, 'dispatchEvent', event);
    const prom = root.exposed!.dispatchEvent!(this.id, type, event);
    const isOwnHandler = Object.prototype.hasOwnProperty.call(
      this.events,
      type,
    );
    if (isOwnHandler) {
      return prom.then((ret: any) => ret?.response ?? ret?.returnValue);
    }
  }
}

function Text({data}: {data?: any}) {
  return String(data);
}
function Comment() {
  return null;
}

export class PreactRemoteReceiver {
  #root: HostNode;
  #nodes = new Map<string, HostNode>();
  rerender: PreactReceiverOptions['rerender'];
  #components: NonNullable<PreactReceiverOptions['components']>;

  connection: RemoteConnection;

  resolved() {
    return this.#root.resolved();
  }

  private attach(
    incoming:
      | RemoteTextSerialization
      | RemoteElementSerialization
      | RemoteCommentSerialization,
  ) {
    const {id, type} = incoming;
    const stored = this.#nodes.get(id);
    if (stored) {
      switch (type) {
        case NODE_TYPE_ELEMENT: {
          const {properties, children} = incoming;
          for (const name in stored.props) {
            if (properties && name in properties) continue;
            stored.setProp(name, undefined);
          }
          for (const name in properties) {
            stored.setProp(name, properties[name]);
          }
          const events = incoming.events || [];
          for (const type in stored.events) {
            if (!events.includes(type)) {
              delete stored.events[type];
            }
          }
          for (const type of events) {
            stored.addEventListener(type);
          }
          if (children) {
            stored.children = [];
            for (const child of children) {
              stored.insertBefore(this.attach(child));
            }
          }
          break;
        }
        case NODE_TYPE_TEXT:
        case NODE_TYPE_COMMENT:
          stored.setProp('data', incoming.data);
          break;
      }
      return stored;
    }

    let node;
    switch (type) {
      case NODE_TYPE_ELEMENT: {
        const {element, properties, children} = incoming;
        const type =
          this.#components.get(element) || this.#components.get('_unknown');
        if (!type) throw Error(`Unknown element type "${element}"`);
        node = createHostNode(id, type, properties);
        if (incoming.events) {
          for (const type of incoming.events) {
            node.addEventListener(type);
          }
        }
        if (children) {
          for (const inner of children) {
            node.insertBefore(this.attach(inner));
          }
        }
        break;
      }
      case NODE_TYPE_TEXT:
        node = createHostNode(id, Text, {data: incoming.data});
        break;
      case NODE_TYPE_COMMENT:
        node = createHostNode(id, Comment, {data: incoming.data});
        break;
    }
    this.#nodes.set(id, node);
    return node;
  }

  private triggerRender() {
    this.rerender!(this.#root.resolved());
  }

  constructor({retain, release, rerender, components}: PreactReceiverOptions) {
    this.rerender = rerender;
    this.#components = components ?? new Map();
    const root = createHostNode('~', Fragment);
    root.isRoot = true;
    root.exposed = {};
    root.api = {
      expose(api: any) {
        Object.assign(root.exposed!, api);
      },
    };
    this.#root = root;
    this.#nodes.set('~', root);

    const getNode = (id: string) => {
      const node = this.#nodes.get(id);
      if (!node) throw Error(`Node#${id} not found`);
      return node;
    };

    this.connection = createRemoteConnection({
      call: (id, method, ...args) => {
        // console.log('call', id, method, ...args);
        const {instance} = getNode(id);
        return (instance as any)[method](...args);
      },
      insertChild: (id, child, index) => {
        // console.log('insertChild', id, child, index);
        const parent = getNode(id);
        parent.insertBefore(this.attach(child), parent.children?.[index]);
        this.triggerRender();
      },
      removeChild: (id, index) => {
        // console.log('removeChild', id, index);
        const parent = getNode(id);
        parent.removeChild(parent.children?.[index]!);
        // this.detach(child);
        this.triggerRender();
      },
      updateProperty: (id, property, value) => {
        // console.log('updateProperty', id, property, value);
        const node = getNode(id);
        const oldValue = node.props[property];
        if (value === oldValue) return;
        release?.(oldValue);
        retain?.(value);
        node.setProp(property, value);
        this.triggerRender();
      },
      updateText: (id, newText) => {
        // console.log('updateText', id, newText);
        const node = getNode(id);
        if (newText === node.props.data) return;
        node.setProp('data', newText);
        this.triggerRender();
      },
      addEventListener: (id, eventType) => {
        // console.log('addEventListener', id, eventType);
        getNode(id).addEventListener(eventType);
      },
      removeEventListener: (id, eventType) => {
        // console.log('removeEventListener', id, eventType);
        getNode(id).removeEventListener(eventType);
      },
    });
  }

  // createEventHandler(
  //   id: string,
  //   type: string,
  //   dispatchEvent: (event: Partial<Event>) => any,
  // ) {
  //   return async (e: Event) => {
  //     const event = {
  //       type,
  //       detail: undefined as any,
  //       bubbles: true,
  //       cancelable: true,
  //     };
  //     if (e instanceof Event) {
  //       if ('detail' in e) {
  //         event.detail = e.detail;
  //       }
  //       event.bubbles = e.bubbles;
  //       event.cancelable = e.cancelable;
  //     } else if (e != null) {
  //       event.detail = e;
  //     }
  //     // const ret = await this.connection.call(id, 'dispatchEvent', event);
  //     const ret = await dispatchEvent(event);
  //     console.log(id, type, ret);
  //   };
  // }
}

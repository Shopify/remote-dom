import type {TreeReceiver} from '.';
import {PROPLESS_TYPES, type BaseNodeTypes} from './components';

type HostChild<AnyNodeType, Element> =
  | HostNode<AnyNodeType, Element>
  | null
  | undefined;

type ComponentProps<T = any> = {
  [K in keyof T]: T[K];
} & {
  children: never;
};

/**
 * Like a JSX Element or DOM Element, but it can be materialized to a (p)react JSX Element (recursively) via .resolved().
 * Mutations (append/remove/setProperty) invalidate the node and its ancestors, causing the next resolved() to return new JSX Elements.
 * Unmodified (cached) nodes returned by resolved() get skipped by (p)react during re-renders.
 */
export class HostNode<
  AnyNodeType = any,
  Element = JSX.Element,
  Type extends AnyNodeType | BaseNodeTypes = AnyNodeType | BaseNodeTypes,
  Props extends ComponentProps = any,
> {
  parent: HostNode<AnyNodeType, Element> | null = null;
  cache: Element | undefined;
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

  constructor(
    private receiver: TreeReceiver<AnyNodeType, Element>,
    public id: string,
    public type: Type,
    public props: Props,
    events?: string[],
    public children?: HostChild<AnyNodeType, Element>[],
    public element?: string,
  ) {
    if (events) for (const type in events) this.events[type] = true;
  }

  resolved(): Element {
    if (this.cache !== undefined) return this.cache;
    const allowProps = !PROPLESS_TYPES.includes(this.type as any);
    const props: Record<string, any> = {
      ...this.props,
      key: this.id,
      ref: this.ref,
      meta: {
        element: this.element,
      },
    };
    if (allowProps) {
      // event delegation
      for (const type in this.events) {
        const propName = 'on' + type[0]!.toUpperCase() + type.slice(1);
        props[propName] = this.createBoundHandler(type);
      }
    }
    if (this.children) {
      for (const child of this.children) {
        const resolved =
          child == null || typeof child !== 'object' ? child : child.resolved();
        const slot = child?.props?.slot;
        if (allowProps && slot && typeof slot === 'string') {
          props[slot] = resolved;
        } else {
          (props.children || (props.children = [])).push(resolved);
        }
      }
    }
    const vnode = this.receiver._createElement(this.type, props);
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
    // if this node wasn't materialized yet, there's nothing to invalidate
    if (!this.isRoot && (!this.cache || !this.parent)) {
      this.cache = undefined;
      return;
    }

    if (this.receiver._beforeTriggerRender?.(this) === false) return;
    let node: HostNode<AnyNodeType, Element> | null = this;
    let connected = false;
    while (node) {
      if (node.isRoot) connected = true;
      node.cache = undefined;
      node = node.parent;
    }
    if (connected) {
      this.receiver._triggerRender(this);
    }
  }

  private invalidateSubtree() {
    this.cache = undefined;
    if (this.children) {
      for (const child of this.children) {
        child?.invalidateSubtree();
      }
    }
  }

  private setChildren(children: HostChild<AnyNodeType, Element>[]) {
    this.children = children;
    this.invalidate();
  }

  setProperty<T extends keyof Props>(name: T, value: Props[T]) {
    const {props} = this;
    if (props[name] === value) return;
    props[name] = value;
    this.invalidate();
  }

  insertBefore(
    child: HostNode<AnyNodeType, Element>,
    before?: HostNode<AnyNodeType, Element> | null,
  ) {
    child.parent = this;
    Object.setPrototypeOf(child.events, this.events);
    let children = this.children;
    if (children) {
      let index = before ? children.indexOf(before) : -1;
      if (index === -1) children.push(child);
      else children.splice(index, 0, child);
      this.setChildren(children);
    } else {
      this.setChildren([child]);
    }
  }

  // replaceChildren(
  //   ...children: HostNode<AnyNodeType, Element>[],
  // ) {
  //   if (this.children) {
  //     for (const child of this.children) {
  //       if (child && !children.includes(child)) {
  //         child.parent = null;
  //         Object.setPrototypeOf(child.events, null);
  //       }
  //     }
  //   }
  //   for (const child of children) {
  //     Object.setPrototypeOf(child.events, this.events);
  //   }
  //   this.setChildren(children);
  // }

  removeChild(child: HostNode<AnyNodeType, Element>) {
    let children = this.children;
    if (children) {
      let index = children.indexOf(child);
      if (index !== -1) children.splice(index, 1);
      else throw Error(`remove(): node is not a child of this parent`);
      this.setChildren(children);
    }
    // @todo - probably makes sense to eagerly invalidate here,
    // since it avoids the need in insertBefore() and frees memory
    // child.cache = undefined;
    // child.invalidateSubtree();
    child.parent = null;
    Object.setPrototypeOf(child.events, null);
  }

  addEventListener(type: string) {
    const prev = type in this.events;
    this.events[type] = true;
    // event type already inherited
    if (prev) return;
    this.invalidateSubtree();
    this.invalidate();
  }

  removeEventListener(type: string) {
    const prev = type in this.events;
    // event type was not set, subtree is unaffected
    if (!prev) return;
    delete this.events[type];
    // ancestor still listening, subtree is unaffected
    if (type in this.events) return;
    this.invalidateSubtree();
    this.invalidate();
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
    const prom = this.receiver._clientApi.dispatchEvent!(this.id, type, event);
    const isOwnHandler = Object.prototype.hasOwnProperty.call(
      this.events,
      type,
    );
    if (isOwnHandler) {
      return prom.then((ret: any) => ret?.response ?? ret?.returnValue);
    }
  }
}

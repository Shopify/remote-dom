import {
  createRemoteConnection,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  type RemoteCommentSerialization,
  type RemoteConnection,
  type RemoteElementSerialization,
  type RemoteTextSerialization,
} from '@remote-dom/core';
import {BASE_COMPONENTS, type BaseNodeTypes} from './components';
import {HostNode} from './HostNode';
import type {TreeReceiverOptions} from './types';

export {HostNode};

/**
 * A Remote Receiver implementation for Virtual DOM hosts.
 * See the [README](../README.md) for more information on the approach and benefits.
 */
export class TreeReceiver<
  NodeTypes = string | Function,
  Element = JSX.Element,
  AnyNodeType extends NodeTypes | BaseNodeTypes = NodeTypes | BaseNodeTypes,
> {
  protected root: ReturnType<typeof this._createHostNode>;
  protected nodes = new Map<string, HostNode<AnyNodeType, Element>>();
  protected components = new Map<string, AnyNodeType | BaseNodeTypes>(
    Object.entries(BASE_COMPONENTS),
  );

  connection: RemoteConnection;

  /**
   * A function to call when the tree is updated.
   * Receives the new tree JSX as an argument.
   */
  rerender: (root: Element) => void;

  /** Returns the current full VDOM tree */
  resolved() {
    return this.root.resolved();
  }

  /**
   * Global API exposed by the client via call('expose', '~', {...})
   * @internal
   */
  _clientApi: any = {};

  /**
   * Fires before cascading invalidation. Return false to prevent invalidation.
   * @internal
   */
  _beforeTriggerRender(
    source: HostNode<AnyNodeType, Element>,
  ): void | boolean {}

  /**
   * Fires after invalidation has occured.
   * @internal
   */
  _triggerRender(source: HostNode<AnyNodeType, Element>) {
    this.rerender?.(this.root.resolved());
  }

  /**
   * The JSX element factory to use when materializing the tree.
   * @internal
   */
  protected _createElement(
    type: AnyNodeType,
    props: {children?: Element[]} | null,
  ): Element {
    return {type, props} as Element;
  }

  /** @internal */
  protected _createHostNode<Type extends AnyNodeType | BaseNodeTypes>(
    id: string,
    type: Type,
    props: any = null,
    events?: string[],
    children?: any[],
  ) {
    return new HostNode<AnyNodeType, Element>(
      this,
      id,
      type,
      props || {},
      events,
      children,
    );
  }

  constructor({
    retain,
    release,
    rerender,
    createElement,
    components,
    events = {},
  }: TreeReceiverOptions<AnyNodeType, Element>) {
    if (createElement) this._createElement = createElement;
    this.rerender = rerender;
    components?.forEach((value, key) => {
      this.components.set(key, value);
    });
    // create the root node, which the client also uses to expose its API:
    const root = this._createHostNode('~', this.components.get('#fragment')!);
    root.isRoot = true;
    root.events = events;
    root.api = {
      expose: (api: any) => {
        Object.assign(this._clientApi, api);
      },
    };
    this.root = root;
    this.nodes.set('~', root);

    /** Look up a node by its unique ID. */
    const getNode = (id: string) => {
      const node = this.nodes.get(id);
      if (!node) throw Error(`Node#${id} not found`);
      return node;
    };

    this.connection = createRemoteConnection({
      call: (id, method, ...args) => {
        const {instance} = getNode(id);
        // for (const arg of args) retain(arg);
        return (instance as any)[method](...args);
      },
      insertChild: (id, child, index) => {
        const parent = getNode(id);
        parent.insertBefore(this._attach(child), parent.children?.[index]);
      },
      removeChild: (id, index) => {
        const parent = getNode(id);
        parent.removeChild(parent.children?.[index]!);
        // this.detach(child);
      },
      updateProperty: (id, property, value) => {
        const node = getNode(id);
        const oldValue = node.props[property];
        if (value === oldValue) return;
        release?.(oldValue);
        retain?.(value);
        node.setProperty(property, value);
      },
      updateText: (id, newText) => {
        const node = getNode(id);
        if (newText === node.props.data) return;
        node.setProperty('data', newText);
      },
      addEventListener: (id, eventType) => {
        getNode(id).addEventListener(eventType);
      },
      removeEventListener: (id, eventType) => {
        getNode(id).removeEventListener(eventType);
      },
    });
  }

  /**
   * The protocol sends serialized representations of inserted nodes and their subtrees.
   * For newly-constructed nodes, we construct the corresponding HostNode tree.
   * For re-attached nodes, we diff the representation against our existing HostNode tree.
   * @internal
   */
  protected _attach(
    incoming:
      | RemoteTextSerialization
      | RemoteElementSerialization
      | RemoteCommentSerialization,
  ) {
    const {id, type} = incoming;
    const stored = this.nodes.get(id);
    if (stored) {
      // Reattaching a previously-attached node. This requires a diff
      // since the node or its subtree may have changed while detached.
      switch (type) {
        case NODE_TYPE_ELEMENT: {
          const {properties, children} = incoming;
          for (const name in stored.props) {
            if (properties && name in properties) continue;
            stored.setProperty(name, undefined);
          }
          for (const name in properties) {
            stored.setProperty(name, properties[name]);
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
              stored.insertBefore(this._attach(child));
            }
          }
          break;
        }
        case NODE_TYPE_TEXT:
        case NODE_TYPE_COMMENT:
          stored.setProperty('data', incoming.data);
          break;
      }
      return stored;
    }

    // attaching a newly-constructed node (create + insert)
    let node;
    switch (type) {
      case NODE_TYPE_ELEMENT: {
        const {element, properties, children} = incoming;
        const type =
          this.components.get(element) || this.components.get('_unknown');
        if (!type) throw Error(`Unknown element type "${element}"`);
        node = this._createHostNode(id, type, properties);
        if (incoming.events) {
          for (const type of incoming.events) {
            node.addEventListener(type);
          }
        }
        if (children) {
          for (const inner of children) {
            node.insertBefore(this._attach(inner));
          }
        }
        break;
      }
      case NODE_TYPE_TEXT:
        node = this._createHostNode(id, this.components.get('#text')!, {
          data: incoming.data,
        });
        break;
      case NODE_TYPE_COMMENT:
        node = this._createHostNode(id, this.components.get('#comment')!, {
          data: incoming.data,
        });
        break;
    }
    this.nodes.set(id, node);
    return node;
  }
}

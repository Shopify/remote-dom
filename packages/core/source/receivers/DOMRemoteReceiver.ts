import {createRemoteConnection, type RemoteConnection} from '../connection.ts';
import {
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../constants.ts';
import type {RemoteNodeSerialization} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

const REMOTE_IDS = new WeakMap<Node, string>();
const REMOTE_PROPERTIES = new WeakMap<Node, Record<string, any>>();
const REMOTE_EVENT_LISTENERS = new WeakMap<Node, Record<string, any>>();

/**
 * Takes care of mapping remote elements to matching HTML elements
 * on the host page. If you implement your UI with [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements),
 * `DOMRemoteReceiver` is a simple option that avoids much of the
 * manual work required when using the basic `RemoteReceiver`.
 */
export class DOMRemoteReceiver {
  /**
   * The root element that will contain the host implementations of
   * all nodes attached to the remote tree. To connect the receiver to
   * a new element, call the `connect()` method.
   */
  readonly root: DocumentFragment | Element;

  /**
   * An object that can synchronize a tree of elements between two JavaScript
   * environments. This object acts as a “thin waist”, allowing for efficient
   * communication of changes between a “remote” environment (usually, a JavaScript
   * sandbox, such as an `iframe` or Web Worker) and a “host” environment
   * (usually, a top-level browser page).
   */
  readonly connection: RemoteConnection;

  private readonly attached = new Map<string, Node>();

  constructor({
    root,
    retain,
    release,
    call,
    cache,
  }: RemoteReceiverOptions & {
    /**
     * The root element for this receiver. This acts as a shortcut for calling
     * `connect()` after creating the receiver.
     */
    root?: Element;

    /**
     * Customizes how [remote methods](https://github.com/Shopify/remote-dom/blob/main/packages/core#remotemethods)
     * are called. By default, the receiver will call a matching method found on
     * the HTML element that represents the remote element. However, you may want to
     * customize this behavior in order to avoid exposing methods on your HTML
     * elements that should not be callable by the remote environment.
     *
     * @param element The HTML element representing the remote element the method is being called on.
     * @param method The name of the method being called.
     * @param args Arguments passed to the method from the remote environment.
     *
     * @example
     * const receiver = new DOMRemoteReceiver({
     *   call(element, method, ...args) {
     *     // Prevent calling any methods that start with an underscore
     *     if (method.startsWith('_')) {
     *       throw new Error(`Cannot call method ${method}`);
     *     }
     *
     *     return element[method](...args);
     *   },
     * });
     */
    call?(element: Element, method: string, ...args: any[]): any;

    /**
     * Controls how DOM elements created in based on remote elements are retained
     * once they are disconnected from the remote environment.
     */
    cache?: {
      /**
       * A timeout in milliseconds after which a detached element will be released.
       */
      maxAge?: number;
    };
  } = {}) {
    this.root = root ?? document.createDocumentFragment();

    const {attached} = this;
    const destroyTimeouts = new Map<string, number>();

    this.connection = createRemoteConnection({
      call: (id, method, ...args) => {
        const element =
          id === ROOT_ID && this.root.nodeType !== 11
            ? this.root
            : attached.get(id)!;

        return call
          ? call(element as any, method, ...args)
          : (element as any)[method](...args);
      },
      insertChild: (parentId, child, nextSiblingId) => {
        const parent =
          parentId === ROOT_ID ? this.root : attached.get(parentId)!;
        const normalizedChild = attach(child);

        if (parent.contains(normalizedChild)) {
          return;
        }

        const existingTimeout = destroyTimeouts.get(parentId);
        if (existingTimeout) clearTimeout(existingTimeout);

        if (nextSiblingId === undefined) {
          parent.appendChild(normalizedChild);
        } else {
          parent.insertBefore(normalizedChild, attached.get(nextSiblingId)!);
        }
      },
      removeChild: (parentId, id) => {
        const child = attached.get(id) as ChildNode;
        child.remove();

        if (cache?.maxAge) {
          const existingTimeout = destroyTimeouts.get(parentId);
          if (existingTimeout) clearTimeout(existingTimeout);

          const timeout = setTimeout(() => {
            detach(child);
          }, cache.maxAge);
          destroyTimeouts.set(parentId, timeout as any);
        } else {
          detach(child);
        }
      },
      updateProperty: (
        id,
        property,
        value,
        type = UPDATE_PROPERTY_TYPE_PROPERTY,
      ) => {
        const element = attached.get(id)!;

        retain?.(value);

        const remoteProperties = REMOTE_PROPERTIES.get(element)!;
        const oldValue = remoteProperties[property];

        remoteProperties[property] = value;
        updateRemoteProperty(element as Element, property, value, type);

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id) as Text;
        text.data = newText;
      },
    });

    function attach(node: RemoteNodeSerialization) {
      const existingNode = attached.get(node.id);
      if (existingNode) return existingNode;

      let normalizedChild: Node;

      switch (node.type) {
        case NODE_TYPE_ELEMENT: {
          normalizedChild = document.createElement(node.element);

          if (node.properties) {
            REMOTE_PROPERTIES.set(normalizedChild, node.properties);

            for (const property of Object.keys(node.properties)) {
              const value = node.properties[property];
              retain?.(value);
              updateRemoteProperty(
                normalizedChild as Element,
                property,
                value,
                UPDATE_PROPERTY_TYPE_PROPERTY,
              );
            }
          } else {
            REMOTE_PROPERTIES.set(normalizedChild, {});
          }

          if (node.attributes) {
            for (const attribute of Object.keys(node.attributes)) {
              const value = node.attributes[attribute];
              retain?.(value);
              updateRemoteProperty(
                normalizedChild as Element,
                attribute,
                value,
                UPDATE_PROPERTY_TYPE_ATTRIBUTE,
              );
            }
          }

          REMOTE_EVENT_LISTENERS.set(normalizedChild, {});

          if (node.eventListeners) {
            for (const event of Object.keys(node.eventListeners)) {
              const listener = node.eventListeners[event];
              retain?.(listener);
              updateRemoteProperty(
                normalizedChild as Element,
                event,
                listener,
                UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
              );
            }
          }

          for (const child of node.children) {
            normalizedChild.appendChild(attach(child));
          }

          break;
        }
        case NODE_TYPE_TEXT: {
          normalizedChild = document.createTextNode(node.data);
          break;
        }
        case NODE_TYPE_COMMENT: {
          normalizedChild = document.createComment(node.data);
          break;
        }
        default: {
          throw new Error(`Unknown node type: ${JSON.stringify(node)}`);
        }
      }

      REMOTE_IDS.set(normalizedChild, node.id);

      attached.set(node.id, normalizedChild);

      return normalizedChild;
    }

    function detach(child: Node) {
      const id = REMOTE_IDS.get(child);
      if (id) attached.delete(id);

      const properties = REMOTE_PROPERTIES.get(child);
      if (properties && release) release(properties);

      if (child instanceof Element) {
        for (const grandChild of child.childNodes) {
          detach(grandChild);
        }
      }
    }
  }

  /**
   * Connects the receiver to a new root element. The representation of
   * any child elements of the remote root will be appended to this node
   * as children, and the `root` property will be updated to point to the
   * new element.
   */
  connect(element: Element) {
    const oldRoot = this.root;
    (this as any).root = element;

    oldRoot.childNodes.forEach((node) => {
      element.appendChild(node);
    });
  }

  /**
   * Disconnects the receiver from its current root element. Any current
   * children of the root element will be moved to a `DocumentFragment`
   * instead, so they can be re-attached to a new element later.
   */
  disconnect() {
    // DocumentFragment
    if (this.root.nodeType === 11) return this.root as DocumentFragment;

    const oldRoot = this.root;
    const fragment = new DocumentFragment();
    (this as any).root = fragment;

    oldRoot.childNodes.forEach((node) => {
      fragment.appendChild(node);
    });

    return fragment;
  }
}

function updateRemoteProperty(
  element: Element,
  property: string,
  value: unknown,
  type:
    | typeof UPDATE_PROPERTY_TYPE_PROPERTY
    | typeof UPDATE_PROPERTY_TYPE_ATTRIBUTE
    | typeof UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
) {
  switch (type) {
    case UPDATE_PROPERTY_TYPE_PROPERTY: {
      (element as any)[property] = value;
      break;
    }
    case UPDATE_PROPERTY_TYPE_ATTRIBUTE: {
      if (value == null) {
        element.removeAttribute(property);
      } else {
        element.setAttribute(property, value as string);
      }

      break;
    }
    case UPDATE_PROPERTY_TYPE_EVENT_LISTENER: {
      const remoteListeners = REMOTE_EVENT_LISTENERS.get(element);
      const existing = remoteListeners?.[property];

      if (existing) element.removeEventListener(property, existing);

      if (value != null) {
        // Support a `RemoteEvent`-shaped event object, where the `detail` argument
        // is passed to the remote environment, and the resulting promise call is passed
        // to `event.resolve()`. A host implementation can use this conventional event shape
        // to use the internal function representation of the event listener.
        const handler = (event: any) => {
          // If the event is bubbling/ capturing, we don’t trigger the listener here,
          // we let the event be dispatched to the remote environment only from the actual
          // target element. In the remote environment, the event will go through a separate
          // capture/ bubbling phase, where it will invoke the remote event listener
          // that corresponds to this `value` function.
          if (event.target !== element) return;
          const result = (value as any)(event.detail);
          event.resolve?.(result);
        };

        if (remoteListeners) {
          remoteListeners[property] = handler;
        }

        element.addEventListener(property, handler);
      }

      break;
    }
  }
}

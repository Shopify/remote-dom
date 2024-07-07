import {createRemoteConnection, type RemoteConnection} from '../connection.ts';
import {
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  REMOTE_ID,
  REMOTE_PROPERTIES,
  REMOTE_EVENT_LISTENERS,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
} from '../constants.ts';
import type {RemoteNodeSerialization} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

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
  } = {}) {
    this.root = root ?? document.createDocumentFragment();

    const {attached} = this;

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
      insertChild: (id, child, index) => {
        const parent = id === ROOT_ID ? this.root : attached.get(id)!;
        parent.insertBefore(attach(child), parent.childNodes[index] || null);
      },
      removeChild: (id, index) => {
        const parent = id === ROOT_ID ? this.root : attached.get(id)!;
        const child = parent.childNodes[index]!;
        child.remove();
        detach(child);
      },
      updateProperty: (
        id,
        property,
        value,
        type = UPDATE_PROPERTY_TYPE_PROPERTY,
      ) => {
        const element = attached.get(id)!;

        retain?.(value);

        const remoteProperties = (element as any)[REMOTE_PROPERTIES];
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
      let normalizedChild: Node;

      switch (node.type) {
        case NODE_TYPE_ELEMENT: {
          normalizedChild = document.createElement(node.element);

          if (node.properties) {
            (normalizedChild as any)[REMOTE_PROPERTIES] = node.properties;

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
            (normalizedChild as any)[REMOTE_PROPERTIES] = {};
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

          if (node.eventListeners) {
            (normalizedChild as any)[REMOTE_EVENT_LISTENERS] = {};

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
          } else {
            (normalizedChild as any)[REMOTE_EVENT_LISTENERS] = {};
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

      (normalizedChild as any)[REMOTE_ID] = node.id;
      attached.set(node.id, normalizedChild);

      return normalizedChild;
    }

    function detach(child: Node) {
      const id = (child as any)[REMOTE_ID];
      if (id) attached.delete(id);

      const properties = (child as any)[REMOTE_PROPERTIES];
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
    if (this.root.nodeType === 11) return;

    const oldRoot = this.root;
    const fragment = new DocumentFragment();
    (this as any).root = fragment;

    oldRoot.childNodes.forEach((node) => {
      fragment.appendChild(node);
    });
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
      const remoteListeners = (element as any)[REMOTE_EVENT_LISTENERS];
      const existing = remoteListeners?.[property];

      if (existing) element.removeEventListener(property, existing);

      if (value != null) {
        // Support a `RemoteEvent`-shaped event object, where the `detail` argument
        // is passed to the remote environment, and the resulting promise call is passed
        // to `event.resolve()`. A host implementation can use this conventional event shape
        // to use the internal function representation of the event listener.
        const handler = (event: any) => {
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

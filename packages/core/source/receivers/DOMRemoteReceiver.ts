import {createRemoteConnection, type RemoteConnection} from '../connection.ts';
import {
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
} from '../constants.ts';
import {setRemoteId} from '../elements/internals.ts';
import type {RemoteNodeSerialization} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

const REMOTE_IDS = new WeakMap<Node, string>();
const REMOTE_PROPERTIES = new WeakMap<Node, Record<string, any>>();
const REMOTE_EVENT_LISTENERS = new WeakMap<Node, Record<string, any>>();

/** Host-owned capabilities exposed to the remote for one element name. */
export interface DOMRemoteElementPolicy {
  readonly properties?: readonly string[];
  readonly attributes?: readonly string[];
  readonly eventListeners?: readonly string[];
  readonly methods?: readonly string[];
}

type ElementPolicy = {
  [Key in keyof Required<DOMRemoteElementPolicy>]: ReadonlySet<string>;
};

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

  constructor(
    options: RemoteReceiverOptions & {
      /**
       * The root element for this receiver. This acts as a shortcut for calling
       * `connect()` after creating the receiver.
       */
      root?: Element;

      /**
       * Host-owned allowlist of element names and their remote capabilities.
       * Defaults to no elements (text and comments are still accepted). An array
       * allows only element creation; use a map to also expose specific properties,
       * attributes, events, and methods. Omitted capabilities are denied.
       *
       * Only expose elements and capabilities that are safe for untrusted input.
       * Values and method arguments are not sanitized by the receiver. This policy
       * is copied at construction and must not come from the remote environment.
       */
      elements?:
        | readonly string[]
        | Readonly<Record<string, DOMRemoteElementPolicy>>;

      /**
       * Customizes how [remote methods](https://github.com/Shopify/remote-dom/blob/main/packages/core#remotemethods)
       * are called. By default, only methods allowed by `elements` can be called,
       * and calls on the root are denied. This callback overrides that policy,
       * including for the root, and must enforce its own host-owned allowlist.
       *
       * @param element The HTML element representing the remote element the method is being called on.
       * @param method The name of the method being called.
       * @param args Arguments passed to the method from the remote environment.
       *
       * @example
       * const receiver = new DOMRemoteReceiver({
       *   elements: ['ui-button'],
       *   call(element, method) {
       *     // Only expose the button's focus method.
       *     if (element.localName !== 'ui-button' || method !== 'focus') {
       *       throw new Error(`Cannot call method ${method}`);
       *     }
       *
       *     return (element as HTMLElement).focus();
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
    } = {},
  ) {
    const {root, elements = [], retain, release, cache} = options;
    this.root = root ?? document.createDocumentFragment();

    const {attached} = this;
    const destroyTimeouts = new Map<string, number>();
    const policies = new Map<string, ElementPolicy>();
    const nodePolicies = new WeakMap<Node, ElementPolicy>();
    const entries: [string, DOMRemoteElementPolicy][] = Array.isArray(elements)
      ? elements.map((name) => [name, {}])
      : Object.entries(elements);

    for (const [name, policy] of entries) {
      policies.set(name, {
        properties: new Set(policy.properties),
        attributes: new Set(policy.attributes),
        eventListeners: new Set(policy.eventListeners),
        methods: new Set(policy.methods),
      });
    }

    this.connection = createRemoteConnection({
      call: (id, method, ...args) => {
        const element =
          id === ROOT_ID && this.root.nodeType !== 11
            ? this.root
            : attached.get(id)!;

        if (!element || element.nodeType !== NODE_TYPE_ELEMENT) {
          throw new Error(`Method target is not allowed: ${id}`);
        }

        const call = options.call;
        if (call) return call(element as Element, method, ...args);

        if (!nodePolicies.get(element)?.methods.has(method)) {
          throw new Error(`Method is not allowed: ${method}`);
        }

        return (element as any)[method](...args);
      },
      insertChild: (id, child, index) => {
        const parent = id === ROOT_ID ? this.root : attached.get(id)!;

        const existingTimeout = destroyTimeouts.get(id);
        if (existingTimeout) clearTimeout(existingTimeout);

        // Validate the entire subtree before constructing any host elements or
        // invoking property setters, custom-element constructors, or retain hooks.
        validate(child);
        parent.insertBefore(attach(child), parent.childNodes[index] || null);
      },
      removeChild: (id, index) => {
        const parent = id === ROOT_ID ? this.root : attached.get(id)!;
        const child = parent.childNodes[index]!;
        child.remove();

        if (cache?.maxAge) {
          const existingTimeout = destroyTimeouts.get(id);
          if (existingTimeout) clearTimeout(existingTimeout);

          const timeout = setTimeout(() => {
            detach(child);
          }, cache.maxAge);
          destroyTimeouts.set(id, timeout as any);
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
        assertPropertyAllowed(nodePolicies.get(element), property, type);

        retain?.(value);

        const remoteProperties = REMOTE_PROPERTIES.get(element)!;
        const oldValue = remoteProperties[property];

        remoteProperties[property] = value;
        updateRemoteProperty(element as Element, property, value, type);

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id);
        // A forged text update must not reach an element's `data` setter and
        // bypass the property policy (for example, a custom element or <object>).
        if (
          !text ||
          (text.nodeType !== NODE_TYPE_TEXT &&
            text.nodeType !== NODE_TYPE_COMMENT)
        ) {
          throw new Error(`Text update target is not allowed: ${id}`);
        }
        (text as Text | Comment).data = newText;
      },
    });

    function assertPropertyAllowed(
      policy: ElementPolicy | undefined,
      property: string,
      type: number,
    ) {
      const allowed =
        type === UPDATE_PROPERTY_TYPE_PROPERTY
          ? policy?.properties
          : type === UPDATE_PROPERTY_TYPE_ATTRIBUTE
            ? policy?.attributes
            : type === UPDATE_PROPERTY_TYPE_EVENT_LISTENER
              ? policy?.eventListeners
              : undefined;

      if (!allowed?.has(property)) {
        throw new Error(
          `Remote property is not allowed: ${property} (type ${type})`,
        );
      }
    }

    function validate(node: RemoteNodeSerialization) {
      const pending = [node];
      const ids = new Set<string>();

      while (pending.length > 0) {
        const current = pending.pop()!;
        if (current.id === ROOT_ID || ids.has(current.id)) {
          throw new Error(`Node ID is not allowed: ${current.id}`);
        }
        ids.add(current.id);

        const existing = attached.get(current.id);
        if (existing && existing.nodeType !== current.type) {
          throw new Error(`Node type is not allowed to change: ${current.id}`);
        }

        switch (current.type) {
          case NODE_TYPE_ELEMENT: {
            const policy = policies.get(current.element);
            if (
              !policy ||
              (existing && nodePolicies.get(existing) !== policy)
            ) {
              throw new Error(`Element is not allowed: ${current.element}`);
            }

            for (const property of Object.keys(current.properties ?? {})) {
              assertPropertyAllowed(
                policy,
                property,
                UPDATE_PROPERTY_TYPE_PROPERTY,
              );
            }
            for (const attribute of Object.keys(current.attributes ?? {})) {
              assertPropertyAllowed(
                policy,
                attribute,
                UPDATE_PROPERTY_TYPE_ATTRIBUTE,
              );
            }
            for (const event of Object.keys(current.eventListeners ?? {})) {
              assertPropertyAllowed(
                policy,
                event,
                UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
              );
            }
            for (const child of current.children) pending.push(child);
            break;
          }
          case NODE_TYPE_TEXT:
          case NODE_TYPE_COMMENT:
            break;
          default:
            throw new Error(`Unknown node type: ${JSON.stringify(current)}`);
        }
      }
    }

    function attach(node: RemoteNodeSerialization) {
      const existingNode = attached.get(node.id);
      if (existingNode) return existingNode;

      let normalizedChild: Node;

      switch (node.type) {
        case NODE_TYPE_ELEMENT: {
          normalizedChild = document.createElement(node.element);
          nodePolicies.set(normalizedChild, policies.get(node.element)!);

          if (node.properties) {
            REMOTE_PROPERTIES.set(
              normalizedChild,
              Object.assign(Object.create(null), node.properties),
            );

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
            REMOTE_PROPERTIES.set(normalizedChild, Object.create(null));
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

          REMOTE_EVENT_LISTENERS.set(normalizedChild, Object.create(null));

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

      setRemoteId(normalizedChild, node.id);

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

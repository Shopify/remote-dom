import {
  createRemoteMutationCallback,
  type RemoteMutationCallback,
} from '../callback.ts';
import {
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  REMOTE_ID,
  REMOTE_PROPERTIES,
} from '../constants.ts';
import type {RemoteNodeSerialization} from '../types.ts';
import type {RemoteReceiverOptions} from './shared.ts';

export class DOMRemoteReceiver {
  readonly root: DocumentFragment | Element = document.createDocumentFragment();
  readonly receive: RemoteMutationCallback;

  get callback() {
    return this.receive;
  }

  private readonly attached = new Map<string, Node>();

  constructor({retain, release}: RemoteReceiverOptions = {}) {
    const {attached} = this;

    this.receive = createRemoteMutationCallback({
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
      updateProperty: (id, property, value) => {
        const element = attached.get(id)!;

        retain?.(value);

        const remoteProperties = (element as any)[REMOTE_PROPERTIES];
        const oldValue = remoteProperties[property];

        remoteProperties[property] = value;
        updateRemoteProperty(element as Element, property, value);

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
              updateRemoteProperty(normalizedChild as Element, property, value);
            }
          } else {
            (normalizedChild as any)[REMOTE_PROPERTIES] = {};
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

  connect(element: Element) {
    const oldRoot = this.root;
    (this as any).root = element;

    oldRoot.childNodes.forEach((node) => {
      element.appendChild(node);
    });
  }

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
) {
  if (property in element) {
    (element as any)[property] = value;
  } else if (value == null) {
    element.removeAttribute(property);
  } else {
    element.setAttribute(property, String(value));
  }
}

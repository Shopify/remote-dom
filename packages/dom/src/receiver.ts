import {release, retain, createRemoteChannel} from '@remote-ui/core';
import type {
  RemoteTextSerialization,
  RemoteComponentSerialization,
} from '@remote-ui/core';

import {PropertyApply, PropertyApplyOptions} from './types';

const REMOTE_ID = Symbol.for('RemoteUi::Dom::Id');
const REMOTE_TYPE = Symbol.for('RemoteUi::Dom::Type');
const REMOTE_PROPS = Symbol.for('RemoteUi::Dom::Props');

type ResolveCustomElement = (component: string) => string | undefined;

interface Options {
  bind?: Node;
  customElement:
    | Map<string, string>
    | {[key: string]: string}
    | ResolveCustomElement;
  applyProperty?: PropertyApply;
}

export class DomReceiver {
  readonly receive = createRemoteChannel({
    mount: (serializedChildren) => {
      const {bound, children} = this;
      const fragment = this.bound ? document.createDocumentFragment() : null;

      if (bound) {
        let child: typeof bound.lastChild;
        while ((child = bound.lastChild)) {
          bound.removeChild(child);
        }
      }

      for (const child of serializedChildren) {
        retain(child);
        const node = this.deserialize(child);
        children.push(node);
        fragment?.appendChild(node);
      }

      if (bound && fragment) {
        bound.appendChild(fragment);
      }
    },
    insertChild: (id, index, child) => {
      retain(child);
      const node = this.deserialize(child);

      if (id == null) {
        this.children.splice(index, 0, node);
        this.bound?.insertBefore(node, this.bound.childNodes[index]);
      } else {
        const parent = this.nodes.get(id)!;
        parent.insertBefore(node, parent.childNodes[index]);
      }
    },
    removeChild: (id, index) => {
      if (id == null) {
        const [child] = this.children.splice(index, 1);
        child.parentNode?.removeChild(child);
        this.release(child);
      } else {
        const node = this.nodes.get(id)!;
        const child = node.childNodes[index];
        node.removeChild(node.childNodes[index]);
        this.release(child);
      }
    },
    updateProps: (id, newProps) => {
      const node = this.nodes.get(id) as HTMLElement & {
        [REMOTE_TYPE]: string;
        [REMOTE_PROPS]: Record<string, unknown>;
      };
      const oldProps = {...node[REMOTE_PROPS]};

      retain(newProps);

      Object.assign(node[REMOTE_PROPS], newProps);

      for (const key of Object.keys(newProps)) {
        this.apply({
          type: node[REMOTE_TYPE],
          element: node as HTMLElement,
          property: key,
          value: (newProps as any)[key],
        });
        release((oldProps as any)[key]);
      }
    },
    updateText: (id, newText) => {
      (this.nodes.get(id) as Text).textContent = newText;
    },
  });

  private nodes = new Map<string, Node>();
  private bound: Node | null = null;
  private children: Node[] = [];
  private applyProperty: PropertyApply;
  private resolveCustomElement: ResolveCustomElement;

  constructor({
    bind,
    customElement,
    applyProperty = defaultApplyProperty,
  }: Options) {
    this.applyProperty = applyProperty;
    this.resolveCustomElement = normalizeCustomElement(customElement);
    if (bind) this.bind(bind);
  }

  bind(node: Node) {
    this.unbind();
    this.bound = node;

    for (const child of this.children) {
      node.appendChild(child);
    }
  }

  unbind() {
    if (this.bound == null) return;

    this.bound = null;

    for (const child of this.children) {
      child.parentNode?.removeChild(child);
    }
  }

  private apply(options: PropertyApplyOptions) {
    const result = this.applyProperty(options);

    if (result === false) {
      defaultApplyProperty(options);
    }
  }

  private release(child: Node) {
    this.nodes.delete((child as any)[REMOTE_ID]);
    release((child as any)[REMOTE_PROPS]);

    for (const grandChild of child.childNodes) {
      this.release(grandChild);
    }
  }

  private deserialize(
    serialized: RemoteTextSerialization | RemoteComponentSerialization,
  ) {
    let node: Node;

    if ('text' in serialized) {
      node = document.createTextNode(serialized.text);
    } else {
      const elementType = this.resolveCustomElement(serialized.type);

      if (elementType == null) {
        throw new Error(
          `Can’t create component of type ${JSON.stringify(
            serialized.type,
          )} because it does not map to a custom element.`,
        );
      }

      node = document.createElement(elementType);

      for (const key of Object.keys(serialized.props)) {
        this.apply({
          type: serialized.type,
          element: node as HTMLElement,
          property: key,
          value: serialized.props[key],
        });
      }

      for (const child of serialized.children) {
        const deserialized = this.deserialize(child);
        node.appendChild(deserialized);
      }

      Object.defineProperty(node, REMOTE_PROPS, {
        value: serialized.props,
        writable: false,
        enumerable: false,
        configurable: true,
      });

      Object.defineProperty(node, REMOTE_TYPE, {
        value: serialized.type,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }

    Object.defineProperty(node, REMOTE_ID, {
      value: serialized.id,
      writable: false,
      enumerable: false,
      configurable: true,
    });

    this.nodes.set(serialized.id, node);
    return node;
  }
}

function normalizeCustomElement(
  customElement: Options['customElement'],
): ResolveCustomElement {
  if (typeof customElement === 'function') {
    return customElement;
  }

  if (customElement instanceof Map) {
    return (component) => customElement.get(component)!;
  }

  return (component) => customElement[component];
}

function defaultApplyProperty({
  element,
  property,
  value,
}: PropertyApplyOptions) {
  (element as any)[property] = value;
}

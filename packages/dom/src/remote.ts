import type {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteChild,
} from '@remote-ui/core';

const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

export const INTERNAL_ROOTS = Symbol.for('RemoteUi.Dom.Roots');
export const INTERNAL_PROPS = Symbol.for('RemoteUi.Dom.Props');

export interface NodeRemoteInternals<RemoteNode extends RemoteChild<any>> {
  readonly [INTERNAL_ROOTS]: Map<RemoteRoot<any, any>, RemoteNode>;
}

export interface TextRemoteInternals
  extends NodeRemoteInternals<RemoteText<any>> {}

export interface ComponentElementRemoteInternals
  extends NodeRemoteInternals<RemoteComponent<any, any>> {
  readonly [INTERNAL_PROPS]: Record<string, unknown>;
}

interface ElementForRemote
  extends Pick<
    HTMLElement,
    | 'nodeName'
    | 'children'
    | 'parentNode'
    | 'nextSibling'
    | 'appendChild'
    | 'insertBefore'
    | 'removeChild'
  > {
  nodeType: typeof NODE_TYPE_ELEMENT;
}

interface ComponentElementForRemote
  extends ElementForRemote,
    Pick<HTMLElement, 'setAttribute'>,
    ComponentElementRemoteInternals {}

interface TextForRemote
  extends Pick<Text, 'nodeName' | 'data' | 'textContent'>,
    TextRemoteInternals {
  nodeType: typeof NODE_TYPE_TEXT;
}

export type {
  TextForRemote as Text,
  ElementForRemote as Element,
  ComponentElementForRemote as ComponentElement,
};

export function createElementFromRoot(
  root: RemoteRoot<any, any>,
  {
    elementToComponent = (name) => name,
  }: {elementToComponent?(element: string): string} = {},
) {
  return createBaseElement('#root', {
    appendChild(child) {
      root.appendChild(nodeToRemote(child as any));
    },
    insertBefore(child, beforeChild) {
      root.insertChildBefore(
        nodeToRemote(child as any),
        nodeToRemote(beforeChild as any),
      );
    },
    removeChild(child) {
      root.removeChild(nodeToRemote(child as any));
    },
  });

  function nodeToRemote(
    node: ComponentElementForRemote | TextForRemote,
  ): RemoteChild<any> {
    assertIsRemote(node);

    let remoteChild = node[INTERNAL_ROOTS].get(root);

    if (remoteChild == null) {
      if (node.nodeType === NODE_TYPE_ELEMENT) {
        remoteChild = root.createComponent(
          elementToComponent(node.nodeName),
          node[INTERNAL_PROPS],
          Array.from(node.children).map((child) => nodeToRemote(child as any)),
        );
      } else {
        remoteChild = root.createText(node.textContent ?? '');
      }

      node[INTERNAL_ROOTS].set(root, remoteChild as any);
    }

    return remoteChild;
  }
}

export const document = {
  createElement(type: string): ComponentElementForRemote {
    const roots: ComponentElementForRemote[typeof INTERNAL_ROOTS] = new Map();
    const props = {};

    const baseElement = createBaseElement(type, {
      appendChild(child) {
        for (const [root, remoteComponent] of roots.entries()) {
          const remoteChild = child[INTERNAL_ROOTS].get(root);
          if (remoteChild) remoteComponent.appendChild(remoteChild);
        }
      },
      insertBefore(child, beforeChild) {
        for (const [root, remoteComponent] of roots.entries()) {
          const remoteChild = child[INTERNAL_ROOTS].get(root);
          const remoteBeforeChild = beforeChild[INTERNAL_ROOTS].get(root);
          if (remoteChild && remoteBeforeChild) {
            remoteComponent.insertChildBefore(remoteChild, remoteBeforeChild);
          }
        }
      },
      removeChild(child) {
        for (const [root, remoteComponent] of roots.entries()) {
          const remoteChild = child[INTERNAL_ROOTS].get(root);
          if (remoteChild) remoteComponent.removeChild(remoteChild);
        }
      },
    });

    const additionalProperties: Omit<
      ComponentElementForRemote,
      keyof typeof baseElement
    > = {
      get [INTERNAL_ROOTS]() {
        return roots;
      },
      get [INTERNAL_PROPS]() {
        return props;
      },
      setAttribute(name, value) {
        const newProps = {[name]: value};
        Object.assign(props, newProps);

        for (const remoteElement of roots.values()) {
          remoteElement.updateProps(newProps);
        }
      },
    };

    Object.defineProperties(
      baseElement,
      Object.getOwnPropertyDescriptors(additionalProperties),
    );

    return baseElement as ComponentElementForRemote;
  },
  createTextNode(text: string): TextForRemote {
    let currentText = text;
    const roots = new Map();

    const textNode: TextForRemote = {
      nodeType: NODE_TYPE_TEXT,
      nodeName: '#text',
      get [INTERNAL_ROOTS]() {
        return roots;
      },
      get data() {
        return currentText;
      },
      set data(content: string) {
        textNode.textContent = content;
      },
      get textContent() {
        return currentText;
      },
      set textContent(content: string) {
        for (const remoteElement of roots.values()) {
          remoteElement.updateText(content);
        }

        currentText = content;
      },
    };

    return textNode;
  },
};

Reflect.defineProperty(globalThis, 'document', {value: document});

function createBaseElement(
  type: string,
  {
    appendChild,
    insertBefore,
    removeChild,
  }: {
    appendChild(node: NodeRemoteInternals<RemoteChild<any>>): void;
    insertBefore(
      node: NodeRemoteInternals<RemoteChild<any>>,
      beforeNode: NodeRemoteInternals<RemoteChild<any>>,
    ): void;
    removeChild(node: NodeRemoteInternals<RemoteChild<any>>): void;
  },
) {
  const children: any[] = [];

  const elementNode: ElementForRemote = {
    nodeType: NODE_TYPE_ELEMENT,
    nodeName: type,
    parentNode: null,
    get children() {
      return children as any;
    },
    get nextSibling() {
      const {parentNode} = elementNode;

      if (parentNode == null) return null;

      return parentNode.children[children.indexOf(elementNode) + 1] ?? null;
    },
    appendChild(child) {
      assertIsRemote(child);

      children.push(child);
      (child as any).parentNode = elementNode;

      appendChild(child);

      return child;
    },
    insertBefore(childOne, childTwo) {
      assertIsRemote(childOne);
      assertIsRemote(childTwo);

      children.splice(children.indexOf(childTwo) - 1, 0, childOne);
      (childOne as any).parentNode = elementNode;

      insertBefore(childOne, childTwo);

      return childOne;
    },
    removeChild(child) {
      assertIsRemote(child);

      if (child.parentNode === ((elementNode as any) as Node)) {
        (child as any).parentNode = null;
      }

      children.splice(children.indexOf(child), 1);

      removeChild(child);

      return child;
    },
  };

  return elementNode;
}

function assertIsRemote(node: any): asserts node is NodeRemoteInternals<any> {
  if (node == null || !(INTERNAL_ROOTS in node)) {
    throw new Error(`${node?.nodeType ?? node} is not a remote node`);
  }
}

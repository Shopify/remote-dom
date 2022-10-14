import type {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteChild,
  RemoteComponentType,
} from '@remote-ui/core';

const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

export const INTERNAL_ROOTS = Symbol.for('RemoteUi.Dom.Roots');
export const INTERNAL_PROPS = Symbol.for('RemoteUi.Dom.Props');
export const INTERNAL_REMOTE = Symbol.for('RemoteUi.Dom.Remote');

export interface NodeRemoteInternals<RemoteNode extends RemoteChild<any>> {
  readonly [INTERNAL_ROOTS]: Map<RootElementForRemote, RemoteNode>;
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

export interface RootElementForRemote extends ElementForRemote {
  readonly [INTERNAL_REMOTE]: {
    readonly root: RemoteRoot<any, any>;
    readonly components: Record<string, RemoteDomComponent<any, any, any>>;
  };
}

interface ComponentElementForRemote
  extends ElementForRemote,
    Pick<
      HTMLElement,
      'setAttribute' | 'removeAttribute' | 'addEventListener' | 'textContent'
    >,
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

export interface RemoteDomComponent<
  Type extends string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props = {},
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
> {
  readonly component: RemoteComponentType<Type, Props, AllowedChildren>;
}

export function createRemoteDomComponent<
  Type extends string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props = {},
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
>(
  component: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  {}: {} = {},
): RemoteDomComponent<Type, Props, AllowedChildren> {
  return {
    component,
  };
}

export function createElementFromRemoteRoot(
  root: RemoteRoot<any, any>,
  {
    components = {},
  }: {components?: Record<string, RemoteDomComponent<any, any, any>>} = {},
): RootElementForRemote {
  const baseElement: RootElementForRemote = createBaseElement('#root', {
    appendChild(child) {
      root.appendChild(nodeToRemote(child as any, baseElement));
    },
    insertBefore(child, beforeChild) {
      if (!beforeChild) {
        root.appendChild(nodeToRemote(child as any, baseElement));
        return;
      }

      root.insertChildBefore(
        nodeToRemote(child as any, baseElement),
        beforeChild && nodeToRemote(beforeChild as any, baseElement),
      );
    },
    removeChild(child) {
      root.removeChild(nodeToRemote(child as any, baseElement));
    },
  }) as any;

  Object.defineProperty(baseElement, INTERNAL_REMOTE, {
    value: {root, components},
  });

  return baseElement;
}

export const document = {
  createElement(type: string): ComponentElementForRemote {
    const roots: ComponentElementForRemote[typeof INTERNAL_ROOTS] = new Map();
    const props = {};

    const baseElement = createBaseElement(type, {
      appendChild(child) {
        for (const [root, remoteComponent] of roots.entries()) {
          remoteComponent.appendChild(nodeToRemote(child as any, root));
        }
      },
      insertBefore(child, beforeChild) {
        for (const [root, remoteComponent] of roots.entries()) {
          const remoteChild = nodeToRemote(child as any, root);
          const remoteBeforeChild =
            beforeChild && nodeToRemote(beforeChild as any, root);

          if (remoteBeforeChild) {
            remoteComponent.insertChildBefore(remoteChild, remoteBeforeChild);
          } else {
            remoteComponent.appendChild(remoteChild);
          }
        }
      },
      removeChild(child) {
        for (const [root, remoteComponent] of roots.entries()) {
          remoteComponent.removeChild(nodeToRemote(child as any, root));
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
      set textContent(content: string) {
        for (const child of baseElement.children) {
          baseElement.removeChild(child);
        }

        console.log('textContent', content);

        baseElement.appendChild(document.createTextNode(content));
      },
      setAttribute(name, value) {
        console.log('setAttribute', name, value);

        const newProps = {[name]: value};
        Object.assign(props, newProps);

        for (const remoteElement of roots.values()) {
          remoteElement.updateProps(newProps);
        }
      },
      removeAttribute(name) {
        console.log('removeAttribute', name);

        const newProps = {[name]: undefined};
        delete (props as any)[name];

        for (const remoteElement of roots.values()) {
          remoteElement.updateProps(newProps);
        }
      },
      addEventListener(event: string, func: any, options?: any) {
        console.log('addEventlistener', event, func, options);

        const newProps = {
          [`on${event[0]!.toUpperCase()}${event.slice(1)}`]: () =>
            func.call(baseElement, {type: event}),
        };

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
  createEvent() {
    return {
      timeStamp: Date.now(),
    };
  },
};

Reflect.defineProperty(globalThis, 'document', {value: document});
Reflect.defineProperty(globalThis, 'window', {value: {document}});
Reflect.defineProperty(globalThis, 'Element', {value: class Element {}});
Reflect.defineProperty(globalThis, 'SVGElement', {value: class SVGElement {}});

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
      beforeNode?: NodeRemoteInternals<RemoteChild<any>> | null,
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
      console.log(`appendChild to ${type}`, child);

      assertIsRemote(child);

      children.push(child);
      (child as any).parentNode = elementNode;

      appendChild(child);

      return child;
    },
    insertBefore(childOne, childTwo) {
      console.log(`insertBefore to ${type}`, childOne, childTwo);

      if (childTwo == null) return elementNode.appendChild(childOne);

      assertIsRemote(childOne);
      if (childTwo) assertIsRemote(childTwo);

      children.splice(children.indexOf(childTwo) - 1, 0, childOne);
      (childOne as any).parentNode = elementNode;

      insertBefore(childOne, childTwo);

      return childOne;
    },
    removeChild(child) {
      console.log(`removeChild to ${type}`, child);

      assertIsRemote(child);

      if (child.parentNode === (elementNode as any as Node)) {
        (child as any).parentNode = null;
      }

      children.splice(children.indexOf(child), 1);

      removeChild(child);

      return child;
    },
  };

  return elementNode;
}

function nodeToRemote(
  node: ComponentElementForRemote | TextForRemote,
  rootElement: RootElementForRemote,
): RemoteChild<any> {
  assertIsRemote(node);

  let remoteChild = node[INTERNAL_ROOTS].get(rootElement);

  if (remoteChild == null) {
    const {root, components} = rootElement[INTERNAL_REMOTE];

    if (node.nodeType === NODE_TYPE_ELEMENT) {
      // TODO: handle missing elements
      const component = components
        ? components[node.nodeName]?.component
        : node.nodeName;

      remoteChild = root.createComponent(
        component,
        {...node[INTERNAL_PROPS]},
        Array.from(node.children).map((child) =>
          nodeToRemote(child as any, rootElement),
        ),
      );
    } else {
      remoteChild = root.createText(node.textContent ?? '');
    }

    node[INTERNAL_ROOTS].set(rootElement, remoteChild as any);
  }

  return remoteChild;
}

function assertIsRemote(node: any): asserts node is NodeRemoteInternals<any> {
  if (node == null || !(INTERNAL_ROOTS in node)) {
    throw new Error(`${node?.nodeType ?? node} is not a remote node`);
  }
}

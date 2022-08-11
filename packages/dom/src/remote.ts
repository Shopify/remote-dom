const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

function createElementFromRoot(
  root: any,
  {
    elementToComponent = (name) => name,
  }: {elementToComponent?(element: string): string} = {},
) {
  const children: any[] = [];

  const rootNode: Pick<
    Element,
    | 'nodeName'
    | 'nodeType'
    | 'children'
    | 'appendChild'
    | 'insertBefore'
    | 'removeChild'
    | 'setAttribute'
  > = {
    nodeName: '#root',
    nodeType: NODE_TYPE_ELEMENT,
    get children() {
      return children as any;
    },
    appendChild(child) {
      const remoteChild = nodeToRemote(child);
      root.appendChild(remoteChild);
      (child as any).parentNode = rootNode;
      children.push(child);

      return child;
    },
    insertBefore(childOne, childTwo) {
      const remoteChildOne = nodeToRemote(childOne);
      const remoteChildTwo = nodeToRemote(childTwo);
      root.insertChildBefore(remoteChildOne, remoteChildTwo);
      (childOne as any).parentNode = rootNode;
      children.splice(children.indexOf(childTwo) - 1, 0, childOne);

      return childOne;
    },
    removeChild(child) {
      const remoteChild = nodeToRemote(child);
      root.removeChild(remoteChild);
      children.splice(children.indexOf(child), 1);

      if (child.parentNode === (rootNode as any as Node)) {
        (child as any).parentNode = null;
      }

      return child;
    },
    setAttribute(name, value) {
      console.log(`root setAttribute`, name, value);
    },
  };

  return rootNode;

  function nodeToRemote(node) {
    let remoteChild = node.roots.get(root);

    if (remoteChild == null) {
      if (node.nodeType === NODE_TYPE_ELEMENT) {
        remoteChild = root.createComponent(
          elementToComponent(node.nodeName),
          node.props,
          node.children.map(nodeToRemote),
        );
      } else {
        remoteChild = root.createText(node.textContent);
      }

      node.roots.set(root, remoteChild);
    }

    return remoteChild;
  }
}

// @ts-ignore
const document: Pick<Document, 'createElement' | 'createTextNode'> = {
  createElement(type: string) {
    const roots = new Map();
    const props = {};
    const children: any[] = [];

    const elementNode: Pick<
      Element,
      | 'nodeName'
      | 'nodeType'
      | 'children'
      | 'parentNode'
      | 'appendChild'
      | 'insertBefore'
      | 'removeChild'
      | 'setAttribute'
    > = {
      nodeType: NODE_TYPE_ELEMENT,
      nodeName: type,
      get roots() {
        return roots;
      },
      get children() {
        return children as any;
      },
      get props() {
        return props;
      },
      get nextSibling() {
        const {parentNode} = elementNode;

        if (parentNode == null) return null;

        return parentNode.children[children.indexOf(elementNode) + 1] ?? null;
      },
      parentNode: null,
      appendChild(child) {
        for (const [root, remoteElement] of roots.entries()) {
          const remoteChild = child.roots.get(root);
          if (remoteChild) remoteElement.appendChild(remoteChild);
        }

        children.push(child);
        (child as any).parentNode = elementNode;

        return child;
      },
      insertBefore(childOne, childTwo) {
        for (const [root, remoteElement] of roots.entries()) {
          const remoteChildOne = childOne.roots.get(root);
          const remoteChildTwo = childTwo.roots.get(root);
          if (remoteChildOne && remoteChildTwo) {
            remoteElement.insertChildBefore(remoteChildOne, remoteChildTwo);
          }
        }

        children.splice(children.indexOf(childTwo) - 1, 0, childOne);
        (childOne as any).parentNode = elementNode;

        return childOne;
      },
      removeChild(child) {
        for (const [root, remoteElement] of roots.entries()) {
          const remoteChild = child.roots.get(root);
          if (remoteChild) remoteElement.removeChild(remoteChild);
        }

        if (child.parentNode === (elementNode as any as Node)) {
          (child as any).parentNode = null;
        }

        children.splice(children.indexOf(child), 1);

        return child;
      },
      setAttribute(name, value) {
        const newProps = {[name]: value};
        Object.assign(props, newProps);

        for (const remoteElement of roots.values()) {
          remoteElement.setProps(newProps);
        }
      },
    };

    return elementNode as Element;
  },
  createTextNode(text) {
    const currentText = text;
    const roots = new Map();

    const textNode: Pick<Text, 'nodeType' | 'nodeName' | 'data' | 'textContent'> = {
      nodeType: NODE_TYPE_TEXT,
      nodeName: '#text',
      get roots() {
        return roots;
      },
      set data(content: string) {
        textNode.textContent = content;
      },
      set textContent(content: string) {
        for (const remoteElement of roots.values()) {
          remoteElement.updateText(content);
        }
      },
      get textContent() {
        return currentText;
      },
    };

    return textNode as Text;

    // return new Proxy(textNode, {
    //   set(target, key, value) {
    //     console.log({target, key, value});
    //     return true;
    //   },
    // });
  },
};

Reflect.defineProperty(globalThis, 'document', {value: document});

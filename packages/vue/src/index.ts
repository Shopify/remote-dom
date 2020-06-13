import {createRenderer as createVueRenderer} from '@vue/runtime-core';

import {isRemoteText} from '@remote-ui/core';
import type {RemoteRoot, RemoteText, RemoteComponent} from '@remote-ui/core';

type Element = RemoteComponent<string, any>;
type Node = Element | RemoteText<any>;

export function createRenderer<Root extends RemoteRoot>(root: Root) {
  const {createApp, render} = createVueRenderer<Node, Element>({
    createComment() {
      // TODO: create a "noop" type
      return root.createText('');
    },
    createElement(type) {
      return root.createComponent(type);
    },
    createText(text) {
      return root.createText(text);
    },
    insert(child, parent, anchor) {
      if (anchor) {
        parent.insertChildBefore(child, anchor);
      } else {
        parent.appendChild(child);
      }
    },
    nextSibling(node) {
      const {parent} = node;
      if (parent == null) return null;

      const {children} = parent;
      return children[children.indexOf(node) + 1] ?? null;
    },
    patchProp(element, key, _, next) {
      element.updateProps({[key]: next});
    },
    remove(node) {
      node.parent?.removeChild(node);
    },
    setElementText,
    setText(node, text) {
      if (isRemoteText(node)) {
        node.updateText(text);
      } else {
        setElementText(node, text);
      }
    },
    parentNode(node) {
      return node.parent;
    },
  });

  return {createApp, render};
}

function setElementText(element: Element, text: string) {
  for (const child of element.children) {
    element.removeChild(child);
  }

  element.appendChild(text);
}

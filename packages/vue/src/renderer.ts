import {createRenderer as createVueRenderer} from '@vue/runtime-core';
import {isRemoteText, isRemoteComponent} from '@remote-ui/core';
import type {RemoteRoot, RemoteText, RemoteComponent} from '@remote-ui/core';

import {createRemoteVueComponent} from './components';

type Component = RemoteComponent<string, any>;
type Node = Component | RemoteText<any>;

interface Options {
  defineComponents?:
    | boolean
    | {[key: string]: string | boolean}
    | ((allowedComponent: string) => string | boolean);
}

export function createRenderer<Root extends RemoteRoot>(
  root: Root,
  {defineComponents = false}: Options = {},
) {
  const {createApp: baseCreateApp, render} = createVueRenderer<
    Node,
    Component | Root
  >({
    createComment() {
      throw new Error('@remote-ui/vue does not support creating comments');
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
      if (!isRemoteComponent(element)) {
        throw new Error(
          'Attempted to patch props on a root node; this should never happen!',
        );
      }

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
        setElementText(node as Component, text);
      }
    },
    parentNode(node) {
      return node.parent;
    },
  });

  function createApp(...args: Parameters<typeof baseCreateApp>) {
    const app = baseCreateApp(...args);

    const {components} = root.options;
    if (defineComponents && components) {
      for (const component of components) {
        let mappedComponent: string | false = false;

        if (defineComponents === true) {
          mappedComponent = component;
        } else if (typeof defineComponents === 'function') {
          const defineResult = defineComponents(component);
          mappedComponent = defineResult === true ? component : defineResult;
        } else {
          const defineResult = defineComponents[component] ?? false;
          mappedComponent = defineResult === true ? component : defineResult;
        }

        if (mappedComponent) {
          app.component(mappedComponent, createRemoteVueComponent(component));
        }
      }
    }

    return app;
  }

  return {createApp, render};
}

function setElementText(element: Component, text: string) {
  for (const child of element.children) {
    element.removeChild(child);
  }

  element.appendChild(text);
}

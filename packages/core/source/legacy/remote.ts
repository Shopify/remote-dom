import type {
  RemoteRoot as LegacyRemoteRoot,
  RemoteText as LegacyRemoteText,
  RemoteChild as LegacyRemoteChild,
  RemoteFragment as LegacyRemoteFragment,
  RemoteComponent as LegacyRemoteComponent,
  RemoteComponentType as LegacyRemoteComponentType,
} from '@remote-ui/core';

import {remoteId, remoteProperties} from '../elements/internals.ts';

export interface LegacyRemoteRootElementMap {
  [key: string]: string;
}

export interface LegacyRemoteRootOptions {
  elements?: LegacyRemoteRootElementMap;
}

export function adaptToLegacyRemoteRoot<
  AllowedComponents extends LegacyRemoteComponentType<
    string,
    any
  > = LegacyRemoteComponentType<any, any>,
  AllowedChildrenTypes extends
    | LegacyRemoteComponentType<string, any>
    | boolean = true,
>(rootElement: Element, options?: LegacyRemoteRootOptions) {
  const nodeToRemoteNodeMap = new WeakMap<Node, LegacyRemoteChild<any>>();
  const remoteNodeToNodeMap = new WeakMap<LegacyRemoteChild<any>, Node>();

  const legacyRoot: LegacyRemoteRoot<AllowedComponents, AllowedChildrenTypes> =
    {
      kind: 0,
      options: {},
      get children() {
        return Array.from(rootElement.children).map((child) =>
          nodeToRemoteNode<any>(child),
        );
      },
      append(...children) {
        rootElement.append(...children.map(remoteNodeToNode));
      },
      appendChild(child) {
        rootElement.append(remoteNodeToNode(child));
      },
      insertBefore(child, before) {
        rootElement.insertBefore(
          remoteNodeToNode(child),
          before ? remoteNodeToNode(before) : null,
        );
      },
      insertChildBefore(child, before) {
        rootElement.insertBefore(
          remoteNodeToNode(child),
          remoteNodeToNode(before),
        );
      },
      removeChild(child) {
        rootElement.removeChild(remoteNodeToNode(child));
      },
      replaceChildren(...children) {
        rootElement.replaceChildren(...children.map(remoteNodeToNode));
      },
      createComponent(type, props?: any, ...children: any[]) {
        const resolvedType = options?.elements?.[type] ?? type;
        const element = document.createElement(resolvedType);

        const remoteComponent: LegacyRemoteComponent<any, any> = {
          get id() {
            return remoteId(element);
          },
          get props() {
            return remoteProperties(element);
          },
          get remoteProps() {
            return remoteProperties(element);
          },
          updateProps(props) {
            updateProps(element, props);
          },
          kind: 1,
          type,
          root: legacyRoot,
          top: legacyRoot,
          get parent() {
            return element.parentNode && nodeToRemoteNode(element.parentNode);
          },
          get children() {
            return Array.from(element.children).map((child) =>
              nodeToRemoteNode<LegacyRemoteComponent<any, any>>(child),
            );
          },
          append(...children) {
            element.append(...children.map(remoteNodeToNode));
          },
          appendChild(child) {
            element.append(remoteNodeToNode(child));
          },
          insertBefore(child, before) {
            element.insertBefore(
              remoteNodeToNode(child),
              before ? remoteNodeToNode(before) : null,
            );
          },
          insertChildBefore(child, before) {
            element.insertBefore(
              remoteNodeToNode(child),
              remoteNodeToNode(before),
            );
          },
          removeChild(child) {
            element.removeChild(remoteNodeToNode(child));
          },
          replaceChildren(...children) {
            element.replaceChildren(...children.map(remoteNodeToNode));
          },
          remove() {
            element.remove();
          },
        };

        if (props) updateProps(element, props);

        for (const child of children) {
          if (Array.isArray(child)) {
            remoteComponent.append(...child);
          } else {
            remoteComponent.append(child);
          }
        }

        return remoteComponent;
      },
      createFragment() {
        const fragment = document.createDocumentFragment();

        const remoteFragment: LegacyRemoteFragment<any> = {
          get id() {
            return remoteId(fragment);
          },
          kind: 3,
          root: legacyRoot,
          top: legacyRoot,
          parent: null,
          get children() {
            return Array.from(fragment.children).map((child) =>
              nodeToRemoteNode<LegacyRemoteComponent<any, any>>(child),
            );
          },
          append(...children) {
            fragment.append(...children.map(remoteNodeToNode));
          },
          appendChild(child) {
            fragment.append(remoteNodeToNode(child));
          },
          insertBefore(child, before) {
            fragment.insertBefore(
              remoteNodeToNode(child),
              before ? remoteNodeToNode(before) : null,
            );
          },
          insertChildBefore(child, before) {
            fragment.insertBefore(
              remoteNodeToNode(child),
              remoteNodeToNode(before),
            );
          },
          removeChild(child) {
            fragment.removeChild(remoteNodeToNode(child));
          },
          replaceChildren(...children) {
            fragment.replaceChildren(...children.map(remoteNodeToNode));
          },
        };

        return remoteFragment;
      },
      createText(content = '') {
        const text = document.createTextNode(content);

        const remoteText: LegacyRemoteText<any> = {
          get id() {
            return remoteId(text);
          },
          kind: 2,
          root: legacyRoot,
          top: legacyRoot,
          get text() {
            return text.textContent ?? '';
          },
          get parent() {
            return text.parentNode && nodeToRemoteNode(text.parentNode);
          },
          remove() {
            text.remove();
          },
          update(content) {
            text.data = content;
          },
          updateText(content) {
            text.data = content;
          },
        };

        nodeToRemoteNodeMap.set(text, remoteText);
        remoteNodeToNodeMap.set(remoteText, text);

        return remoteText;
      },
      mount() {
        return Promise.resolve();
      },
    };

  return legacyRoot;

  function nodeToRemoteNode<
    Remote extends LegacyRemoteChild<any> = LegacyRemoteChild<any>,
  >(node: Node) {
    const remote = nodeToRemoteNodeMap.get(node);

    if (remote == null) {
      throw new Error(`Can’t find remote node for ${String(node)}`);
    }

    return remote as Remote;
  }

  function remoteNodeToNode<NodeType extends Node = Node>(
    remote: LegacyRemoteChild<any> | string,
  ) {
    if (typeof remote === 'string') {
      return remoteNodeToNode<Text>(legacyRoot.createText(remote));
    }

    const node = remoteNodeToNodeMap.get(remote);

    if (node == null) {
      throw new Error(`Can’t find node for ${String(remote)}`);
    }

    return node as NodeType;
  }
}

function updateProps(element: Element, props: any) {
  for (const key of Object.keys(props)) {
    const value = props[key];
    if (key in element || typeof value === 'function') {
      (element as any)[key] = value;
    } else {
      element.setAttribute(key, String(value));
    }
  }
}

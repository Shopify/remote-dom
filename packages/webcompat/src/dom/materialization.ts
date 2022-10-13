import {
  ATTRIBUTES,
  CHANNEL,
  CHILD,
  DATA,
  GENERATE_ID,
  ID,
  LISTENERS,
  NAME,
  NEXT,
  NodeType,
  NS,
  USER_PROPERTIES,
  VALUE,
} from './constants';
import type {Node} from './Node';
import type {ParentNode} from './ParentNode';
import type {Text} from './Text';
import type {Element} from './Element';

function isTextNode(node: Node): node is Text {
  return node.nodeType === NodeType.TEXT_NODE;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

/**
 * Materialize/instantiate a Node and its subtree on the host.
 * Recursively invokes "queued" Channel methods for a previously-disconnected tree.
 */
export function materializeTree(node: Node, parent: ParentNode) {
  let id = node[ID]!;
  // node that already have an ID are already materialized:
  if (id !== undefined) return;

  const parentId = parent[ID];
  const channel = parent[CHANNEL]!;

  if (isTextNode(node)) {
    // give the node an ID and channel reference:
    id = node[GENERATE_ID]();
    node[CHANNEL] = channel;

    channel.createText(id, node[DATA], parentId);
  } else if (isElementNode(node)) {
    // give the element an ID and channel reference:
    id = node[GENERATE_ID]();
    node[CHANNEL] = channel;

    // create the element
    const ns = node.isDefaultNamespace(node[NS]) ? null : node[NS];
    channel.createElement(id, node[NAME], ns, parentId);

    // set properties
    const properties = node[USER_PROPERTIES];
    if (properties) {
      // node[USER_PROPERTIES] = undefined;
      // for (const prop of properties) {
      //   channel.setProperty(id, prop, node[prop]);
      // }
      // eslint-disable-next-line guard-for-in
      for (const prop in properties) {
        channel.setProperty(id, prop, properties[prop]);
      }
    }

    // set attributes
    const attributes = node[ATTRIBUTES];
    if (attributes) {
      let attr = attributes[CHILD];
      while (attr) {
        channel.setAttribute(id, attr[NAME], attr[VALUE], attr[NS]);
        attr = attr[NEXT];
      }
    }

    // add event handlers
    const listeners = node[LISTENERS];
    if (listeners) {
      listeners.forEach((list, key) => {
        const fn = list.proxy;
        if (fn && list.size !== 0) {
          const type = key.replace(/@$/, '');
          channel.addListener(id, type, fn);
        }
      });
    }

    // materialize and append children recursively
    let child = node[CHILD];
    while (child) {
      materializeTree(child, parent);
      channel.insert(id, child[ID]!);
      child = child[NEXT];
    }
  }
}

import {NEXT, PREV} from './constants.ts';
import {performWithCustomElementReactions} from './custom-element-reactions.ts';
import type {ParentNode} from './ParentNode.ts';
import {Node} from './Node.ts';

export class ChildNode extends Node {
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.removeChild(this);
  }

  replaceWith(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;

    return performWithCustomElementReactions(() => {
      validateNodesForInsertion(parent, nodes);

      let next = this[NEXT];
      while (next && nodes.includes(next)) next = next[NEXT];

      const replacement = convertNodesIntoNode(parent, nodes);
      if (this.parentNode === parent) {
        parent.replaceChild(replacement, this);
      } else {
        parent.insertBefore(replacement, next);
      }
    });
  }

  before(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;

    return performWithCustomElementReactions(() => {
      validateNodesForInsertion(parent, nodes);

      let previous = this[PREV];
      while (previous && nodes.includes(previous)) previous = previous[PREV];

      const node = convertNodesIntoNode(parent, nodes);
      parent.insertBefore(node, previous ? previous[NEXT] : parent.firstChild);
    });
  }

  after(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;

    return performWithCustomElementReactions(() => {
      validateNodesForInsertion(parent, nodes);

      let next = this[NEXT];
      while (next && nodes.includes(next)) next = next[NEXT];

      const node = convertNodesIntoNode(parent, nodes);
      parent.insertBefore(node, next);
    });
  }
}

export function toNode(parent: ParentNode, node: Node | any) {
  if (node instanceof Node) return node;
  const ownerDocument = parent.ownerDocument;
  return ownerDocument.createTextNode(String(node));
}

function validateNodesForInsertion(
  parent: ParentNode,
  nodes: (Node | string)[],
) {
  for (const node of nodes) {
    if (!(node instanceof Node)) continue;

    let ancestor: Node | null = parent;
    while (ancestor) {
      if (ancestor === node) {
        throw Error(
          'cannot insert a node into itself or one of its descendants',
        );
      }
      ancestor = ancestor.parentNode;
    }
  }
}

function convertNodesIntoNode(
  parent: ParentNode,
  nodes: (Node | string)[],
): Node {
  const convertedNodes: Node[] = [];
  for (const node of nodes) convertedNodes.push(toNode(parent, node));
  if (convertedNodes.length === 1) return convertedNodes[0]!;

  const fragment = parent.ownerDocument.createDocumentFragment();
  for (const node of convertedNodes) fragment.appendChild(node);
  return fragment;
}

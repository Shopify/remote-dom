import {NEXT} from './constants';
import type {ParentNode} from './ParentNode';
import {Node} from './Node';
// import {Text} from './Text';

/** Ensure the argument is a Node, coercing strings to Text nodes */
export function toNode(parent: ParentNode, node: Node | any) {
  if (node instanceof Node) return node;
  const ownerDocument = parent.ownerDocument;
  return ownerDocument.createTextNode(String(node));

  // @todo - need to find a nice fallback for when we're converting without an ownerDocument,
  // or prove this can never happen (since Element should always have ownerDocument).
  // if (ownerDocument) return ownerDocument.createTextNode(String(node));
  // return new Text(String(node));
}

export class ChildNode extends Node {
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.removeChild(this);
  }

  replaceWith(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    const node = toNode(parent, nodes[0]);
    const next = node[NEXT];
    parent.replaceChild(this, node);
    for (let i = 1; i < nodes.length; i++) {
      parent.insertBefore(toNode(parent, nodes[i]), next);
    }
  }

  before(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), this);
    }
  }

  after(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    const next = this[NEXT];
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), next);
    }
  }
}

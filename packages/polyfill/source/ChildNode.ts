import {NEXT} from './constants.ts';
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
    // Anchor on the first following sibling that isn't itself being moved, so
    // that replacing a node with one of its own siblings still has a reference
    // node left to insert before.
    let next = this[NEXT];
    while (next && nodes.includes(next)) next = next[NEXT];
    parent.removeChild(this);
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), next);
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

export function toNode(parent: ParentNode, node: Node | any) {
  if (node instanceof Node) return node;
  const ownerDocument = parent.ownerDocument;
  return ownerDocument.createTextNode(String(node));
}

import {ChildNode, toNode} from './ChildNode.ts';
import {
  CHILD,
  HOOKS,
  IS_CONNECTED,
  NEXT,
  NodeType,
  OWNER_DOCUMENT,
  PARENT,
  PREV,
} from './constants.ts';
import type {Node} from './Node.ts';
import {NodeList} from './NodeList.ts';
import {querySelector, querySelectorAll} from './selectors.ts';
import {selfAndDescendants} from './shared.ts';

export class ParentNode extends ChildNode {
  readonly childNodes = new NodeList();
  readonly children = new NodeList();

  appendChild(child: Node) {
    this.insertInto(child, null);
  }

  insertBefore(child: Node, ref?: Node | null) {
    this.insertInto(child, ref || null);
  }

  append(...nodes: (Node | string)[]) {
    for (const child of nodes) {
      if (child == null) continue;
      this.appendChild(toNode(this, child));
    }
  }

  prepend(...nodes: (Node | string)[]) {
    const before = this.firstChild;
    for (const child of nodes) {
      if (child == null) continue;
      this.insertBefore(toNode(this, child), before);
    }
  }

  replaceChildren(...nodes: (Node | string)[]) {
    let child;
    while ((child = this.firstChild)) {
      this.removeChild(child);
    }
    this.append(...nodes);
  }

  removeChild(child: Node) {
    if (child.parentNode !== this) throw Error(`not a child of this node`);
    const prev = child[PREV];
    const next = child[NEXT];
    if (prev) prev[NEXT] = next;
    else this[CHILD] = next;
    if (next) next[PREV] = prev;

    const childNodes = this.childNodes;

    const childNodesIndex = childNodes.indexOf(child);

    childNodes.splice(childNodesIndex, 1);

    if (child.nodeType === 1) {
      const children = this.children;
      children.splice(children.indexOf(child), 1);
    }

    child[PARENT] = null;
    child[NEXT] = null;
    child[PREV] = null;

    if (this[IS_CONNECTED]) {
      for (const node of selfAndDescendants(child)) {
        node[IS_CONNECTED] = false;
        (node as any).disconnectedCallback?.();
      }
    }

    if (this.nodeType === NodeType.ELEMENT_NODE) {
      this[HOOKS].removeChild?.(this as any, child as any);
    }
  }

  replaceChild(newChild: Node, oldChild: Node) {
    if (oldChild.parentNode !== this) {
      throw Error('reference node is not a child of this parent');
    }
    const next = oldChild[NEXT];
    this.removeChild(oldChild);
    this.insertInto(newChild, next);
  }

  querySelectorAll(selector: string) {
    return querySelectorAll(this, selector);
  }

  querySelector(selector: string) {
    return querySelector(this, selector);
  }

  private insertInto(child: Node, before: Node | null) {
    // append the children of a DocumentFragment:
    if (child.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
      let node = child[CHILD];
      while (node) {
        const next = node[NEXT];
        this.insertInto(node, before);
        node = next;
      }
      return;
    }

    if (child.parentNode !== null) {
      child.parentNode.removeChild(child);
    }

    if (before) {
      if (before.parentNode !== this) {
        throw Error('reference node is not a child of this parent');
      }
      child[NEXT] = before;
      child[PREV] = before[PREV];
      if (before[PREV] === null) this[CHILD] = child;
      before[PREV] = child;
    } else {
      child[NEXT] = null;
      let last = this[CHILD];
      if (last) {
        let next;
        while ((next = last[NEXT])) last = next;
        last[NEXT] = child;
        child[PREV] = last;
      } else {
        this[CHILD] = child;
        child[PREV] = null;
      }
    }

    const ownerDocument = this[OWNER_DOCUMENT];
    const isElement = child.nodeType === NodeType.ELEMENT_NODE;

    child[PARENT] = this;
    child[OWNER_DOCUMENT] = ownerDocument;

    const childNodes = this.childNodes;
    let insertIndex: number;

    if (before) {
      insertIndex = childNodes.indexOf(before);
      childNodes.splice(insertIndex, 0, child);

      if (isElement) {
        const children = this.children;
        let ref: Node | null = before;
        while (ref && ref.nodeType !== 1) ref = ref[NEXT];
        if (ref) {
          children.splice(children.indexOf(ref), 0, child);
        } else {
          children.push(child);
        }
      }
    } else {
      childNodes.push(child);
      if (isElement) this.children.push(child);
    }

    if (this[IS_CONNECTED]) {
      for (const node of selfAndDescendants(child)) {
        node[IS_CONNECTED] = true;
        (node as any).connectedCallback?.();
      }
    }

    if (this.nodeType === NodeType.ELEMENT_NODE) {
      this[HOOKS].insertChild?.(this as any, child as any);
    }
  }
}

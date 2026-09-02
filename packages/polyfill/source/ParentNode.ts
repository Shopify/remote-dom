import {
  CHILD,
  NEXT,
  PREV,
  PARENT,
  HOST,
  OWNER_DOCUMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  NODE_TYPE_ELEMENT,
  HOOKS,
  IS_CONNECTED,
} from './constants.ts';
import type {Node} from './Node.ts';
import {ChildNode, toNode} from './ChildNode.ts';
import {NodeList} from './NodeList.ts';
import {querySelectorAll, querySelector} from './selectors.ts';
import {selfAndDescendants} from './shared.ts';
import {
  childListObserversActive,
  mutationNodeList,
  queueMutationRecord,
} from './MutationObserver.ts';

export class ParentNode extends ChildNode {
  readonly childNodes = new NodeList();
  readonly children = new NodeList();

  appendChild<T extends Node>(child: T) {
    this.insertInto(child, null);
    return child;
  }

  insertBefore<T extends Node>(child: T, ref?: Node | null) {
    this.insertInto(child, ref || null);
    return child;
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

    if (childListObserversActive) {
      queueMutationRecord({
        type: 'childList',
        target: this,
        removedNodes: mutationNodeList(child),
        previousSibling: prev,
        nextSibling: next,
      });
    }

    if (this.nodeType === NODE_TYPE_ELEMENT) {
      this[HOOKS].removeChild?.(this as any, child as any, childNodesIndex);
    }
  }

  replaceChild(newChild: Node, oldChild: Node) {
    if (oldChild.parentNode !== this) {
      throw Error('reference node is not a child of this parent');
    }
    if (newChild === oldChild) return;

    const next = oldChild[NEXT];
    this.validateInsertion(newChild, next);
    this.removeChild(oldChild);
    this.insertIntoValidated(newChild, next);
  }

  querySelectorAll(selector: string) {
    return querySelectorAll(this, selector);
  }

  querySelector(selector: string) {
    return querySelector(this, selector);
  }

  private insertInto(child: Node, before: Node | null) {
    this.validateInsertion(child, before);
    this.insertIntoValidated(child, before);
  }

  private validateInsertion(child: Node, before: Node | null) {
    if (before && before.parentNode !== this) {
      throw Error('reference node is not a child of this parent');
    }

    let ancestor: Node | null = this;
    while (ancestor) {
      if (ancestor === child) {
        throw Error(
          'cannot insert a node into itself or one of its descendants',
        );
      }
      ancestor = ancestor[PARENT] ?? ancestor[HOST];
    }
  }

  private insertIntoValidated(child: Node, before: Node | null) {
    if (child === before) return;

    // append the children of a DocumentFragment:
    if (child.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT) {
      let node = child[CHILD];
      while (node) {
        const next = node[NEXT];
        this.insertIntoValidated(node, before);
        node = next;
      }
      return;
    }

    if (child.parentNode !== null) {
      child.parentNode.removeChild(child);
    }

    if (before) {
      const previous = before[PREV];
      child[NEXT] = before;
      child[PREV] = previous;
      if (previous) previous[NEXT] = child;
      else this[CHILD] = child;
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
    const isElement = child.nodeType === NODE_TYPE_ELEMENT;

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
      insertIndex = childNodes.length;
      childNodes.push(child);
      if (isElement) this.children.push(child);
    }

    if (this[IS_CONNECTED]) {
      for (const node of selfAndDescendants(child)) {
        node[IS_CONNECTED] = true;
        (node as any).connectedCallback?.();
      }
    }

    if (childListObserversActive) {
      queueMutationRecord({
        type: 'childList',
        target: this,
        addedNodes: mutationNodeList(child),
        previousSibling: child[PREV],
        nextSibling: child[NEXT],
      });
    }

    if (this.nodeType === NODE_TYPE_ELEMENT) {
      this[HOOKS].insertChild?.(this as any, child as any, insertIndex);
    }
  }
}

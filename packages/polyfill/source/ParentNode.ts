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
  enqueueCustomElementReaction,
  performWithCustomElementReactions,
} from './custom-element-reactions.ts';

export class ParentNode extends ChildNode {
  readonly childNodes = new NodeList();
  readonly children = new NodeList();

  appendChild<T extends Node>(child: T) {
    return performWithCustomElementReactions(() => {
      this.insertInto(child, null);
      return child;
    });
  }

  insertBefore<T extends Node>(child: T, ref?: Node | null) {
    return performWithCustomElementReactions(() => {
      this.insertInto(child, ref || null);
      return child;
    });
  }

  append(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      for (const child of nodes) {
        if (child == null) continue;
        this.appendChild(toNode(this, child));
      }
    });
  }

  prepend(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      const before = this.firstChild;
      for (const child of nodes) {
        if (child == null) continue;
        this.insertBefore(toNode(this, child), before);
      }
    });
  }

  replaceChildren(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      let child;
      while ((child = this.firstChild)) {
        this.removeChild(child);
      }
      this.append(...nodes);
    });
  }

  removeChild(child: Node) {
    return performWithCustomElementReactions(() => {
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

      let disconnectedNodes: Node[] | undefined;
      if (this[IS_CONNECTED]) {
        disconnectedNodes = selfAndDescendants(child);
        for (const node of disconnectedNodes) node[IS_CONNECTED] = false;
      }

      if (this.nodeType === NODE_TYPE_ELEMENT) {
        this[HOOKS].removeChild?.(this as any, child as any, childNodesIndex);
      }

      if (disconnectedNodes) {
        for (const node of disconnectedNodes) {
          const callback = (node as any).disconnectedCallback;
          if (typeof callback === 'function') {
            enqueueCustomElementReaction(() => callback.call(node));
          }
        }
      }

      return child;
    });
  }

  replaceChild(newChild: Node, oldChild: Node) {
    return performWithCustomElementReactions(() => {
      if (oldChild.parentNode !== this) {
        throw Error('reference node is not a child of this parent');
      }
      if (newChild === oldChild) return oldChild;

      const next = oldChild[NEXT];
      this.validateInsertion(newChild, next);
      this.removeChild(oldChild);
      this.insertIntoValidated(newChild, next);

      return oldChild;
    });
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

    // Append a stable snapshot of the children of a DocumentFragment.
    if (child.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT) {
      const nodes: Node[] = [];
      let node = child[CHILD];
      while (node) {
        nodes.push(node);
        node = node[NEXT];
      }
      for (const node of nodes) this.insertIntoValidated(node, before);
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

    let connectedNodes: Node[] | undefined;
    if (this[IS_CONNECTED]) {
      connectedNodes = selfAndDescendants(child);
      for (const node of connectedNodes) node[IS_CONNECTED] = true;
    }

    if (this.nodeType === NODE_TYPE_ELEMENT) {
      this[HOOKS].insertChild?.(this as any, child as any, insertIndex);
    }

    if (connectedNodes) {
      for (const node of connectedNodes) {
        const callback = (node as any).connectedCallback;
        if (typeof callback === 'function') {
          enqueueCustomElementReaction(() => callback.call(node));
        }
      }
    }
  }
}

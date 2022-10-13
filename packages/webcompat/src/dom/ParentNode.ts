import {
  CHILD,
  NEXT,
  PREV,
  ID,
  CHANNEL,
  PARENT,
  OWNER_DOCUMENT,
  NodeType,
  // PROXY,
} from './constants';
import type {Node} from './Node';
// import type {Element} from './Element';
import {ChildNode, toNode} from './ChildNode';
import {NodeList} from './NodeList';
import {materializeTree} from './materialization';

export class ParentNode extends ChildNode {
  private _children?: NodeList;
  private _childNodes?: NodeList;

  // [CHILD]?: Node | null;
  get children() {
    let children = this._children;
    if (!children) {
      children = new NodeList();
      let child = this[CHILD];
      while (child) {
        if (child.nodeType !== 1) continue;
        children.push(child);
        child = child[NEXT];
      }
      this._children = children;
    }
    return children;
  }

  get childNodes() {
    let childNodes = this._childNodes;
    if (!childNodes) {
      childNodes = new NodeList();
      let child = this[CHILD];
      while (child) {
        childNodes.push(child);
        child = child[NEXT];
      }
      this._childNodes = childNodes;
    }
    return childNodes;
  }

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

    const childNodes = this._childNodes;
    if (childNodes) childNodes.splice(childNodes.indexOf(child), 1);
    if (child.nodeType === 1) {
      const children = this._children;
      if (children) children.splice(children.indexOf(child), 1);
    }

    const id = child[ID];
    const channel = this[CHANNEL];
    if (id !== undefined && channel) channel.remove(id);
  }

  replaceChild(newChild: Node, oldChild: Node) {
    if (oldChild.parentNode !== this) {
      throw Error('reference node is not a child of this parent');
    }
    const next = oldChild[NEXT];
    this.removeChild(oldChild);
    this.insertInto(newChild, next);
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

    const isElement = child.nodeType === NodeType.ELEMENT_NODE;
    const isText = child.nodeType === NodeType.TEXT_NODE;

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

    // @todo support DocumentFragment insertion
    const childNodes = this._childNodes;
    const children = this._children;
    if (before) {
      if (childNodes) {
        childNodes.splice(childNodes.indexOf(before), 0, child);
      }
      if (children && isElement) {
        let ref: Node | null = before;
        while (ref && ref.nodeType !== 1) ref = ref[NEXT];
        if (ref) {
          children.splice(children.indexOf(ref), 0, child);
        } else {
          children.push(child);
        }
      }
    } else {
      if (childNodes) childNodes.push(child);
      if (children && isElement) children.push(child);
    }

    const ownerDocument = this[OWNER_DOCUMENT];
    const channel = this[CHANNEL] || ownerDocument[CHANNEL];

    // child[PARENT] = isElementNode(this) ? this[PROXY] : this;
    child[PARENT] = this;
    // automatically importNode() on append
    child[OWNER_DOCUMENT] = ownerDocument;
    child[CHANNEL] = channel;

    const id = this[ID];
    const isRenderedNode = isElement || isText;
    // if (id && !channel) throw Error('no channel');
    if (id !== undefined && isRenderedNode && channel) {
      materializeTree(child, this);
      channel.insert(id, child[ID]!, before ? before[ID] : undefined);
    }
  }
}

// function isElementNode(node: Node): node is Element {
//   return node.nodeType === NodeType.ELEMENT_NODE;
// }

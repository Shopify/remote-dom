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
import {performHookEffects} from './hook-effects.ts';

interface PreparedInsertionRoot {
  node: Node;
  nodes: Node[] | undefined;
  shouldDisconnect: boolean;
  source?: {parent: ParentNode; index: number};
  insertIndex?: number;
}

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

      const disconnectedNodes = this[IS_CONNECTED]
        ? selfAndDescendants(child)
        : undefined;
      const childNodesIndex = this.detachChild(child);

      if (disconnectedNodes) {
        for (const node of disconnectedNodes) node[IS_CONNECTED] = false;
      }

      if (disconnectedNodes) {
        this.enqueueTreeReactions(disconnectedNodes, 'disconnectedCallback');
      }
      performHookEffects(
        this.collectRemovalHookEffects(child, childNodesIndex),
      );

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

      const insertion = this.prepareInsertion(newChild);
      const removedNodes = this[IS_CONNECTED]
        ? selfAndDescendants(oldChild)
        : undefined;
      const insertionRoots = new Set(insertion.map(({node}) => node));
      let before = next;
      while (before && insertionRoots.has(before)) before = before[NEXT];

      const oldChildIndex = this.detachChild(oldChild);
      if (removedNodes) {
        for (const node of removedNodes) node[IS_CONNECTED] = false;

        const removedNodeSet = new Set(removedNodes);
        for (const prepared of insertion) {
          if (removedNodeSet.has(prepared.node)) {
            prepared.shouldDisconnect = false;
          }
        }
      }

      this.commitInsertion(insertion, before);
      const destinationIsConnected = this[IS_CONNECTED];

      if (removedNodes) {
        this.enqueueTreeReactions(removedNodes, 'disconnectedCallback');
      }
      this.enqueueInsertionReactions(insertion, destinationIsConnected);
      performHookEffects([
        ...this.collectRemovalHookEffects(oldChild, oldChildIndex),
        ...this.collectInsertionHookEffects(insertion),
      ]);

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

    const insertion = this.prepareInsertion(child);
    this.commitInsertion(insertion, before);
    const destinationIsConnected = this[IS_CONNECTED];
    this.enqueueInsertionReactions(insertion, destinationIsConnected);
    performHookEffects(this.collectInsertionHookEffects(insertion));
  }

  private prepareInsertion(child: Node) {
    const roots: Node[] = [];

    if (child.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT) {
      let node = child[CHILD];
      while (node) {
        roots.push(node);
        node = node[NEXT];
      }
    } else {
      roots.push(child);
    }

    const destinationIsConnected = this[IS_CONNECTED];
    const insertion: PreparedInsertionRoot[] = [];
    for (const node of roots) {
      const wasConnected = node[IS_CONNECTED];
      insertion.push({
        node,
        nodes:
          wasConnected || destinationIsConnected
            ? selfAndDescendants(node)
            : undefined,
        shouldDisconnect: wasConnected,
      });
    }

    return insertion;
  }

  private commitInsertion(
    insertion: PreparedInsertionRoot[],
    before: Node | null,
  ) {
    for (const prepared of insertion) {
      const sourceParent = prepared.node[PARENT];
      if (sourceParent) {
        prepared.source = {
          parent: sourceParent,
          index: sourceParent.detachChild(prepared.node),
        };
      }
    }

    for (const prepared of insertion) {
      prepared.insertIndex = this.attachChild(prepared.node, before);
    }

    const isConnected = this[IS_CONNECTED];
    for (const {nodes} of insertion) {
      if (nodes) {
        for (const node of nodes) node[IS_CONNECTED] = isConnected;
      }
    }
  }

  private detachChild(child: Node) {
    const previous = child[PREV];
    const next = child[NEXT];
    if (previous) previous[NEXT] = next;
    else this[CHILD] = next;
    if (next) next[PREV] = previous;

    const childNodesIndex = this.childNodes.indexOf(child);
    this.childNodes.splice(childNodesIndex, 1);

    if (child.nodeType === NODE_TYPE_ELEMENT) {
      this.children.splice(this.children.indexOf(child), 1);
    }

    child[PARENT] = null;
    child[NEXT] = null;
    child[PREV] = null;

    return childNodesIndex;
  }

  private attachChild(child: Node, before: Node | null) {
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

    const isElement = child.nodeType === NODE_TYPE_ELEMENT;
    child[PARENT] = this;
    child[OWNER_DOCUMENT] = this[OWNER_DOCUMENT];

    let insertIndex: number;
    if (before) {
      insertIndex = this.childNodes.indexOf(before);
      this.childNodes.splice(insertIndex, 0, child);

      if (isElement) {
        let reference: Node | null = before;
        while (reference && reference.nodeType !== NODE_TYPE_ELEMENT) {
          reference = reference[NEXT];
        }
        if (reference) {
          this.children.splice(this.children.indexOf(reference), 0, child);
        } else {
          this.children.push(child);
        }
      }
    } else {
      insertIndex = this.childNodes.length;
      this.childNodes.push(child);
      if (isElement) this.children.push(child);
    }

    return insertIndex;
  }

  private collectRemovalHookEffects(child: Node, childNodesIndex: number) {
    if (this.nodeType !== NODE_TYPE_ELEMENT) return [];

    return [
      () =>
        this[HOOKS].removeChild?.(this as any, child as any, childNodesIndex),
    ];
  }

  private collectInsertionHookEffects(insertion: PreparedInsertionRoot[]) {
    const effects: Array<() => void> = [];

    for (const prepared of insertion) {
      const {node, source} = prepared;
      if (source?.parent.nodeType === NODE_TYPE_ELEMENT) {
        effects.push(() =>
          source.parent[HOOKS].removeChild?.(
            source.parent as any,
            node as any,
            source.index,
          ),
        );
      }

      if (this.nodeType === NODE_TYPE_ELEMENT) {
        effects.push(() =>
          this[HOOKS].insertChild?.(
            this as any,
            node as any,
            prepared.insertIndex!,
          ),
        );
      }
    }

    return effects;
  }

  private enqueueInsertionReactions(
    insertion: PreparedInsertionRoot[],
    destinationIsConnected: boolean,
  ) {
    for (const prepared of insertion) {
      const {nodes} = prepared;
      if (nodes) {
        if (prepared.shouldDisconnect) {
          this.enqueueTreeReactions(nodes, 'disconnectedCallback');
        }
        if (destinationIsConnected) {
          this.enqueueTreeReactions(nodes, 'connectedCallback');
        }
      }
    }
  }

  private enqueueTreeReactions(
    nodes: Node[],
    callbackName: 'connectedCallback' | 'disconnectedCallback',
  ) {
    for (const node of nodes) {
      const callback = (node as any)[callbackName];
      if (typeof callback === 'function') {
        enqueueCustomElementReaction(() => callback.call(node));
      }
    }
  }
}

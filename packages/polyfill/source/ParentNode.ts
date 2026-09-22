import {
  CHILD,
  NEXT,
  PREV,
  PARENT,
  OWNER_DOCUMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  NODE_TYPE_ELEMENT,
  HOOKS,
  IS_CONNECTED,
} from './constants.ts';
import type {Node} from './Node.ts';
import type {Element} from './Element.ts';
import {
  ChildNode,
  INSERT_NODE,
  PREFLIGHT_INSERTIONS,
  REPLACE_NODE,
  stageNodes,
  toNode,
  validateInsertionNodes,
} from './ChildNode.ts';
import {NodeList} from './NodeList.ts';
import {querySelectorAll, querySelector} from './selectors.ts';
import {
  adoptNodes,
  collectAdoptionSnapshot,
  isElementNode,
  selfAndDescendants,
} from './shared.ts';
import {
  childListObserversActive,
  mutationNodeList,
  queueMutationRecord,
} from './MutationObserver.ts';
import {
  enqueueCustomElementReaction,
  performWithCustomElementReactions,
} from './custom-element-reactions.ts';
import {
  isCoveredByPendingPublication,
  performHookEffects,
  type HookEffect,
} from './hook-effects.ts';
import {createDOMException} from './dom-exception.ts';

interface PreparedInsertionRoot {
  node: Node;
  nodes: Node[] | undefined;
  adoption: Node[] | undefined;
  shouldDisconnect: boolean;
  source?: {
    parent: ParentNode;
    index: number;
    previousSibling: Node | null;
    nextSibling: Node | null;
  };
  insertIndex?: number;
  previousSibling?: Node | null;
  nextSibling?: Node | null;
}

export class ParentNode extends ChildNode {
  readonly childNodes = new NodeList<Node>();
  readonly children = new NodeList<Element>();

  appendChild<T extends Node>(child: T) {
    return performWithCustomElementReactions(() =>
      this[INSERT_NODE](child, null),
    );
  }

  insertBefore<T extends Node>(child: T, ref?: Node | null) {
    return performWithCustomElementReactions(() =>
      this[INSERT_NODE](child, ref || null),
    );
  }

  append(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      const staged = stageNodes(nodes.filter((node) => node != null));
      if (staged.length > 1) validateInsertionNodes(this, staged);
      for (const child of staged) {
        this[INSERT_NODE](toNode(this, child), null);
      }
    });
  }

  prepend(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      const staged = stageNodes(nodes.filter((node) => node != null));
      if (staged.length > 1) validateInsertionNodes(this, staged);
      const before = this.firstChild;
      for (const child of staged) {
        this[INSERT_NODE](toNode(this, child), before);
      }
    });
  }

  replaceChildren(...nodes: (Node | string)[]) {
    return performWithCustomElementReactions(() => {
      const staged = stageNodes(nodes.filter((node) => node != null));
      validateInsertionNodes(this, staged);

      let child;
      while ((child = this.firstChild)) {
        this.removeChildImmediately(child);
      }
      for (const node of staged) {
        this[INSERT_NODE](toNode(this, node), null);
      }
    });
  }

  removeChild(child: Node) {
    return performWithCustomElementReactions(() => {
      this.removeChildImmediately(child);
      return child;
    });
  }

  private removeChildImmediately(child: Node) {
    if (child.parentNode !== this) {
      throw createDOMException(
        'The node is not a child of this node',
        'NotFoundError',
      );
    }
    const disconnectedNodes = this[IS_CONNECTED]
      ? selfAndDescendants(child)
      : undefined;
    const previousSibling = child[PREV];
    const nextSibling = child[NEXT];
    const childNodesIndex = detachChild(this, child);

    if (disconnectedNodes) {
      for (const node of disconnectedNodes) node[IS_CONNECTED] = false;
    }

    this.queueRemovalMutationRecord(this, child, previousSibling, nextSibling);

    if (disconnectedNodes) {
      this.enqueueTreeReactions(disconnectedNodes, 'disconnectedCallback');
    }
    performHookEffects(this.collectRemovalHookEffects(child, childNodesIndex));
  }

  replaceChild(newChild: Node, oldChild: Node) {
    return performWithCustomElementReactions(() =>
      this[REPLACE_NODE](newChild, oldChild),
    );
  }

  [REPLACE_NODE](newChild: Node, oldChild: Node, hookEffects?: HookEffect[]) {
    validateInsertionNodes(this, [newChild]);
    if (oldChild.parentNode !== this) {
      throw createDOMException(
        'The reference node is not a child of this parent',
        'NotFoundError',
      );
    }

    const previous = oldChild[PREV];
    const next = oldChild[NEXT];
    const insertion = this.prepareInsertion(newChild);
    const removedNodes = this[IS_CONNECTED]
      ? selfAndDescendants(oldChild)
      : undefined;
    const insertionRoots = new Set(insertion.map(({node}) => node));
    let before = next;
    while (before && insertionRoots.has(before)) before = before[NEXT];

    const oldChildIndex = detachChild(this, oldChild);
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

    this.queueRemovalMutationRecord(this, oldChild, previous, next);
    this.queueInsertionMutationRecords(insertion);

    if (removedNodes) {
      this.enqueueTreeReactions(removedNodes, 'disconnectedCallback');
    }
    this.enqueueInsertionReactions(insertion, destinationIsConnected);
    this.performOrCollectHookEffects(
      [
        ...this.collectRemovalHookEffects(oldChild, oldChildIndex),
        ...this.collectInsertionHookEffects(insertion),
      ],
      hookEffects,
    );

    return oldChild;
  }

  querySelectorAll(selector: string) {
    return querySelectorAll(this, selector);
  }

  querySelector(selector: string) {
    return querySelector(this, selector);
  }

  [INSERT_NODE]<T extends Node>(
    child: T,
    before: Node | null,
    hookEffects?: HookEffect[],
  ) {
    this.validateInsertion(child, before);
    this.insertIntoValidated(child, before, hookEffects);
    return child;
  }

  [PREFLIGHT_INSERTIONS](children: Node[]) {
    for (const child of children) {
      this.validateInsertion(child, null);
      this.prepareInsertion(child);
    }
  }

  private validateInsertion(child: Node, before: Node | null) {
    validateInsertionNodes(this, [child]);

    if (before && before.parentNode !== this) {
      throw createDOMException(
        'The reference node is not a child of this parent',
        'NotFoundError',
      );
    }
  }

  private insertIntoValidated(
    child: Node,
    before: Node | null,
    hookEffects?: HookEffect[],
  ) {
    if (child === before) before = child[NEXT];

    const insertion = this.prepareInsertion(child);
    this.commitInsertion(insertion, before);
    const destinationIsConnected = this[IS_CONNECTED];
    this.queueInsertionMutationRecords(insertion);
    this.enqueueInsertionReactions(insertion, destinationIsConnected);
    this.performOrCollectHookEffects(
      this.collectInsertionHookEffects(insertion),
      hookEffects,
    );
  }

  private performOrCollectHookEffects(
    effects: HookEffect[],
    hookEffects?: HookEffect[],
  ) {
    if (hookEffects) hookEffects.push(...effects);
    else performHookEffects(effects);
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
    const ownerDocument = this[OWNER_DOCUMENT];
    const insertion: PreparedInsertionRoot[] = [];
    for (const node of roots) {
      const wasConnected = node[IS_CONNECTED];
      const shouldTraverse = wasConnected || destinationIsConnected;
      let nodes: Node[] | undefined;
      let adoption: Node[] | undefined;

      if (node[OWNER_DOCUMENT] === ownerDocument) {
        if (shouldTraverse) nodes = selfAndDescendants(node);
      } else {
        const snapshot = collectAdoptionSnapshot(node);
        adoption = snapshot.nodes;
        if (shouldTraverse) nodes = snapshot.treeNodes;
      }

      insertion.push({node, nodes, adoption, shouldDisconnect: wasConnected});
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
        const previousSibling = prepared.node[PREV];
        const nextSibling = prepared.node[NEXT];
        prepared.source = {
          parent: sourceParent,
          index: detachChild(sourceParent, prepared.node),
          previousSibling,
          nextSibling,
        };
      }
    }

    for (const prepared of insertion) {
      const attached = this.attachChild(prepared.node, before);
      prepared.insertIndex = attached.index;
      prepared.previousSibling = attached.previousSibling;
      prepared.nextSibling = attached.nextSibling;
    }

    const ownerDocument = this[OWNER_DOCUMENT];
    for (const {adoption} of insertion) {
      if (adoption) adoptNodes(adoption, ownerDocument);
    }

    const isConnected = this[IS_CONNECTED];
    for (const {nodes} of insertion) {
      if (nodes) {
        for (const node of nodes) node[IS_CONNECTED] = isConnected;
      }
    }
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

    const isElement = isElementNode(child);
    child[PARENT] = this;

    let insertIndex: number;
    if (before) {
      insertIndex = this.childNodes.indexOf(before);
      this.childNodes.splice(insertIndex, 0, child);

      if (isElement) {
        let reference: Node | null = before;
        while (reference && !isElementNode(reference)) {
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

    return {
      index: insertIndex,
      previousSibling: child[PREV],
      nextSibling: child[NEXT],
    };
  }

  private queueRemovalMutationRecord(
    parent: ParentNode,
    child: Node,
    previousSibling: Node | null,
    nextSibling: Node | null,
  ) {
    if (!childListObserversActive) return;

    queueMutationRecord({
      type: 'childList',
      target: parent,
      removedNodes: mutationNodeList(child),
      previousSibling,
      nextSibling,
    });
  }

  private queueInsertionMutationRecords(insertion: PreparedInsertionRoot[]) {
    if (!childListObserversActive) return;

    for (const prepared of insertion) {
      const {node, source} = prepared;
      if (source) {
        this.queueRemovalMutationRecord(
          source.parent,
          node,
          source.previousSibling,
          source.nextSibling,
        );
      }

      queueMutationRecord({
        type: 'childList',
        target: this,
        addedNodes: mutationNodeList(node),
        previousSibling: prepared.previousSibling,
        nextSibling: prepared.nextSibling,
      });
    }
  }

  private collectRemovalHookEffects(child: Node, childNodesIndex: number) {
    if (
      this.nodeType !== NODE_TYPE_ELEMENT ||
      isCoveredByPendingPublication(this)
    ) {
      return [];
    }

    return [
      [
        () =>
          this[HOOKS].removeChild?.(this as any, child as any, childNodesIndex),
      ],
    ] as HookEffect[];
  }

  private collectInsertionHookEffects(insertion: PreparedInsertionRoot[]) {
    const effects: HookEffect[] = [];

    for (const prepared of insertion) {
      const {node, source} = prepared;
      if (
        source?.parent.nodeType === NODE_TYPE_ELEMENT &&
        !isCoveredByPendingPublication(source.parent)
      ) {
        effects.push([
          () =>
            source.parent[HOOKS].removeChild?.(
              source.parent as any,
              node as any,
              source.index,
            ),
        ]);
      }

      if (
        this.nodeType === NODE_TYPE_ELEMENT &&
        !isCoveredByPendingPublication(this)
      ) {
        effects.push([
          () =>
            this[HOOKS].insertChild?.(
              this as any,
              node as any,
              prepared.insertIndex!,
            ),
          node,
        ]);
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
    enqueueTreeReactions(nodes, callbackName);
  }
}

export function removeChildForAdoption(
  parent: ParentNode,
  child: Node,
  adoption: ReturnType<typeof collectAdoptionSnapshot>,
  destination: Node['ownerDocument'],
) {
  if (child.parentNode !== parent) throw Error(`not a child of this node`);

  const disconnectedNodes = parent[IS_CONNECTED]
    ? adoption.treeNodes
    : undefined;
  const previousSibling = child[PREV];
  const nextSibling = child[NEXT];
  const childNodesIndex = detachChild(parent, child);

  if (disconnectedNodes) {
    for (const node of disconnectedNodes) node[IS_CONNECTED] = false;
  }
  adoptNodes(adoption.nodes, destination);

  if (childListObserversActive) {
    queueMutationRecord({
      type: 'childList',
      target: parent,
      removedNodes: mutationNodeList(child),
      previousSibling,
      nextSibling,
    });
  }

  if (disconnectedNodes) {
    enqueueTreeReactions(disconnectedNodes, 'disconnectedCallback');
  }

  const effects: HookEffect[] = [];
  if (
    parent.nodeType === NODE_TYPE_ELEMENT &&
    !isCoveredByPendingPublication(parent)
  ) {
    effects.push([
      () =>
        (parent as any)[HOOKS].removeChild?.(parent, child, childNodesIndex),
    ]);
  }
  performHookEffects(effects);
}

function detachChild(parent: ParentNode, child: Node) {
  const previous = child[PREV];
  const next = child[NEXT];
  if (previous) previous[NEXT] = next;
  else parent[CHILD] = next;
  if (next) next[PREV] = previous;

  const childNodesIndex = parent.childNodes.indexOf(child);
  parent.childNodes.splice(childNodesIndex, 1);

  if (isElementNode(child)) {
    parent.children.splice(parent.children.indexOf(child), 1);
  }

  child[PARENT] = null;
  child[NEXT] = null;
  child[PREV] = null;

  return childNodesIndex;
}

function enqueueTreeReactions(
  nodes: Node[],
  callbackName: 'connectedCallback' | 'disconnectedCallback',
) {
  for (const node of nodes) {
    const callback = (node as any)[callbackName];
    if (typeof callback === 'function') {
      enqueueCustomElementReaction(node, () => callback.call(node));
    }
  }
}

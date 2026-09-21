import {HOST, NEXT, PARENT, PREV} from './constants.ts';
import {performWithCustomElementReactions} from './custom-element-reactions.ts';
import {performHookEffects, type HookEffect} from './hook-effects.ts';
import type {ParentNode} from './ParentNode.ts';
import {Node} from './Node.ts';

export const INSERT_NODE = Symbol('insertNode');
export const PREFLIGHT_INSERTIONS = Symbol('preflightInsertions');
export const REPLACE_NODE = Symbol('replaceNode');

export class ChildNode extends Node {
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.removeChild(this);
  }

  replaceWith(...nodes: (Node | string)[]) {
    const staged = stageNodes(nodes);
    const parent = this.parentNode;
    if (!parent) return;

    return performChildNodeMutation((hookEffects) => {
      validateNodesForInsertion(parent, staged);

      let next = this[NEXT];
      while (next && staged.includes(next)) next = next[NEXT];

      const replacement = convertNodesIntoNode(parent, staged, hookEffects);
      if (this.parentNode === parent) {
        parent[REPLACE_NODE](replacement, this, hookEffects);
      } else {
        parent[INSERT_NODE](replacement, next, hookEffects);
      }
    });
  }

  before(...nodes: (Node | string)[]) {
    const staged = stageNodes(nodes);
    const parent = this.parentNode;
    if (!parent) return;

    return performChildNodeMutation((hookEffects) => {
      validateNodesForInsertion(parent, staged);

      let previous = this[PREV];
      while (previous && staged.includes(previous)) previous = previous[PREV];

      const node = convertNodesIntoNode(parent, staged, hookEffects);
      parent[INSERT_NODE](
        node,
        previous ? previous[NEXT] : parent.firstChild,
        hookEffects,
      );
    });
  }

  after(...nodes: (Node | string)[]) {
    const staged = stageNodes(nodes);
    const parent = this.parentNode;
    if (!parent) return;

    return performChildNodeMutation((hookEffects) => {
      validateNodesForInsertion(parent, staged);

      let next = this[NEXT];
      while (next && staged.includes(next)) next = next[NEXT];

      const node = convertNodesIntoNode(parent, staged, hookEffects);
      parent[INSERT_NODE](node, next, hookEffects);
    });
  }
}

function performChildNodeMutation(
  mutation: (hookEffects: HookEffect[]) => void,
) {
  return performWithCustomElementReactions(() => {
    const hookEffects: HookEffect[] = [];
    try {
      mutation(hookEffects);
    } catch (error) {
      try {
        performHookEffects(hookEffects);
      } catch {}
      throw error;
    }
    performHookEffects(hookEffects);
  });
}

function stageNodes(nodes: (Node | string)[]) {
  return nodes.map((node) => (node instanceof Node ? node : String(node)));
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
      ancestor = ancestor[PARENT] ?? ancestor[HOST];
    }
  }
}

function convertNodesIntoNode(
  parent: ParentNode,
  nodes: (Node | string)[],
  hookEffects: HookEffect[],
): Node {
  const convertedNodes: Node[] = [];
  for (const node of nodes) convertedNodes.push(toNode(parent, node));
  if (convertedNodes.length === 1) return convertedNodes[0]!;

  const fragment = parent.ownerDocument.createDocumentFragment();
  fragment[PREFLIGHT_INSERTIONS](convertedNodes);
  for (const node of convertedNodes) {
    fragment[INSERT_NODE](node, null, hookEffects);
  }
  return fragment;
}

import {
  DATA,
  OWNER_DOCUMENT,
  ATTRIBUTES,
  NODE_TYPE_COMMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  CHILD,
  NEXT,
  NAME,
  HTML_NAMESPACE,
  asciiLowercase,
  CONTENT,
} from './constants.ts';
import type {Document} from './Document.ts';
import type {DocumentFragment} from './DocumentFragment.ts';
import type {Node} from './Node.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import type {CharacterData} from './CharacterData.ts';
import type {Text} from './Text.ts';
import type {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {MATCHER_ID, querySelector} from './selectors.ts';

export function isCharacterData(node: Node): node is CharacterData {
  return DATA in node;
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === NODE_TYPE_TEXT;
}

export function isCommentNode(node: Node): node is Comment {
  return node.nodeType === NODE_TYPE_COMMENT;
}

export function isElementNode(node: Node): node is Element {
  return node.nodeType === NODE_TYPE_ELEMENT;
}

export function isDocumentFragmentNode(node: Node): node is DocumentFragment {
  return node.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT;
}

export function isParentNode(node: Node): node is ParentNode {
  return 'appendChild' in node;
}

export function collectAdoptionSnapshot(root: Node) {
  const nodes: Node[] = [];
  const pendingRoots = [root];
  const pending = new Set<Node>(pendingRoots);
  const visited = new Set<Node>();
  let treeNodes: Node[] | undefined;

  while (pendingRoots.length > 0) {
    const currentRoot = pendingRoots.pop()!;
    pending.delete(currentRoot);
    if (visited.has(currentRoot)) continue;

    const currentTreeNodes: Node[] = [];
    for (const node of selfAndDescendants(currentRoot)) {
      if (visited.has(node)) continue;

      visited.add(node);
      nodes.push(node);
      currentTreeNodes.push(node);
      if (!isElementNode(node)) continue;

      const attributes = node[ATTRIBUTES];
      if (attributes) {
        for (const attribute of attributes) {
          if (visited.has(attribute)) continue;
          visited.add(attribute);
          nodes.push(attribute);
        }
      }

      const content = (node as HTMLTemplateElement)[CONTENT];
      if (content && !visited.has(content) && !pending.has(content)) {
        pending.add(content);
        pendingRoots.push(content);
      }
    }

    treeNodes ??= currentTreeNodes;
  }

  return {nodes, treeNodes: treeNodes!};
}

export function adoptNodes(nodes: Node[], document: Document) {
  for (const node of nodes) node[OWNER_DOCUMENT] = document;
}

export function cloneNode(
  node: Node,
  deep?: boolean,
  document: Document = node.ownerDocument,
): Node {
  if (isTextNode(node)) {
    return document.createTextNode(node.data);
  } else if (isCommentNode(node)) {
    return document.createComment(node.data);
  } else if (isElementNode(node)) {
    const cloned = document.createElement(node.localName);

    if (node[ATTRIBUTES]) {
      for (let i = 0; i < node[ATTRIBUTES].length; i++) {
        const attribute = node[ATTRIBUTES].item(i)!;
        cloned.setAttributeNS(
          attribute.namespaceURI,
          attribute.name,
          attribute.value,
        );
      }
    }

    if (deep) {
      for (const child of node.childNodes) {
        cloned.appendChild(cloneNode(child, true, document));
      }
    }

    return cloned;
  } else if (isDocumentFragmentNode(node)) {
    const fragment = document.createDocumentFragment();

    if (deep) {
      for (const child of (node as DocumentFragment).childNodes) {
        fragment.appendChild(cloneNode(child, true, document));
      }
    }

    return fragment;
  } else {
    const cloned = new (node.constructor as any)();
    cloned[OWNER_DOCUMENT] = document;
    return cloned;
  }
}

export function getElementById(within: ParentNode, elementId: string) {
  const id = String(elementId);
  if (id === '') return null;

  return querySelector(within, [{type: MATCHER_ID, name: id}]);
}

export function getElementsByTagName(
  within: ParentNode,
  qualifiedName: string,
) {
  const name = String(qualifiedName);
  const normalizedHtmlName = asciiLowercase(name);
  const elements: Element[] = [];

  for (const node of descendants(within)) {
    if (!isElementNode(node)) continue;

    if (
      name === '*' ||
      (node.namespaceURI === HTML_NAMESPACE
        ? node[NAME] === normalizedHtmlName
        : node[NAME] === name)
    ) {
      elements.push(node);
    }
  }

  return elements;
}

export function descendants(node: Node) {
  const nodes: Node[] = [];
  const pendingSiblings: Node[] = [];
  let current = node[CHILD];

  while (current) {
    nodes.push(current);

    const child = current[CHILD];
    const sibling = current[NEXT];
    if (child) {
      if (sibling) pendingSiblings.push(sibling);
      current = child;
    } else {
      current = sibling ?? pendingSiblings.pop() ?? null;
    }
  }

  return nodes;
}

export function selfAndDescendants(node: Node) {
  const nodes = descendants(node);
  nodes.unshift(node);
  return nodes;
}

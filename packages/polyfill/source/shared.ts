import {
  DATA,
  OWNER_DOCUMENT,
  ATTRIBUTES,
  NODE_TYPE_ATTRIBUTE,
  NODE_TYPE_COMMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  CHILD,
  NEXT,
  NAME,
  PREFIX,
  CONTENT,
  HTML_NAMESPACE,
  CREATE_ELEMENT,
  asciiLowercase,
} from './constants.ts';
import type {Document} from './Document.ts';
import type {DocumentFragment} from './DocumentFragment.ts';
import type {Node} from './Node.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import type {Attr} from './Attr.ts';
import type {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import type {CharacterData} from './CharacterData.ts';
import type {Text} from './Text.ts';
import {MATCHER_ID, querySelector} from './selectors.ts';

export function isAttributeNode(node: Node): node is Attr {
  return node.nodeType === NODE_TYPE_ATTRIBUTE;
}

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

function cloneAttribute(attribute: Attr, document: Document) {
  const Attribute = attribute.constructor as new (
    name: string,
    value: string,
    namespace?: string | null,
  ) => Attr;
  const cloned = new Attribute(
    attribute.name,
    attribute.value,
    attribute.namespaceURI,
  );
  cloned[OWNER_DOCUMENT] = document;
  return cloned;
}

function cloneNodeShallow(node: Node, document: Document): Node {
  if (isTextNode(node)) {
    return document.createTextNode(node.data);
  } else if (isCommentNode(node)) {
    return document.createComment(node.data);
  } else if (isAttributeNode(node)) {
    return cloneAttribute(node, document);
  } else if (isElementNode(node)) {
    const cloned = document[CREATE_ELEMENT](
      node[NAME],
      node.namespaceURI,
      node[PREFIX],
      node.localName,
    );

    if (node[ATTRIBUTES]) {
      for (let i = 0; i < node[ATTRIBUTES].length; i++) {
        const attribute = node[ATTRIBUTES].item(i)!;
        cloned.attributes.setNamedItem(cloneAttribute(attribute, document));
      }
    }

    return cloned;
  } else if (isDocumentFragmentNode(node)) {
    return document.createDocumentFragment();
  } else {
    const cloned = new (node.constructor as any)();
    cloned[OWNER_DOCUMENT] = document;
    return cloned;
  }
}

type CloneParent = Element | DocumentFragment;

interface CloneFrame {
  source: CloneParent;
  destination: CloneParent;
  appendTo?: ParentNode;
  childIndex: number;
  cloningContent: boolean;
  contentSource?: DocumentFragment;
  contentDestination?: DocumentFragment;
}

export function cloneNode(
  node: Node,
  deep?: boolean,
  document: Document = node.ownerDocument,
): Node {
  const cloned = cloneNodeShallow(node, document);

  if (!deep || (!isElementNode(node) && !isDocumentFragmentNode(node))) {
    return cloned;
  }

  const visited = new Set<Node>([node]);
  const frames: CloneFrame[] = [
    {
      source: node,
      destination: cloned as CloneParent,
      childIndex: 0,
      cloningContent: false,
    },
  ];

  while (frames.length > 0) {
    const frame = frames[frames.length - 1]!;
    let sourceChild: Node | undefined;
    let destinationParent: ParentNode;

    if (!frame.cloningContent) {
      sourceChild = frame.source.childNodes[frame.childIndex++];
      destinationParent = frame.destination;

      if (!sourceChild) {
        frame.cloningContent = true;
        frame.childIndex = 0;

        if (
          isElementNode(frame.source) &&
          frame.source.namespaceURI === HTML_NAMESPACE &&
          frame.source.localName === 'template'
        ) {
          const content = (frame.source as HTMLTemplateElement)[CONTENT];
          if (content) {
            if (visited.has(content)) throwCloneGraphError();
            visited.add(content);
            frame.contentSource = content;
            frame.contentDestination = (
              frame.destination as HTMLTemplateElement
            ).content;
          }
        }

        continue;
      }
    } else if (frame.contentSource && frame.contentDestination) {
      sourceChild = frame.contentSource.childNodes[frame.childIndex++];
      destinationParent = frame.contentDestination;
    } else {
      frames.pop();
      if (frame.appendTo) frame.appendTo.appendChild(frame.destination);
      continue;
    }

    if (!sourceChild) {
      frames.pop();
      if (frame.appendTo) frame.appendTo.appendChild(frame.destination);
      continue;
    }

    if (visited.has(sourceChild)) throwCloneGraphError();
    visited.add(sourceChild);
    const clonedChild = cloneNodeShallow(sourceChild, document);

    if (isElementNode(sourceChild) || isDocumentFragmentNode(sourceChild)) {
      frames.push({
        source: sourceChild,
        destination: clonedChild as CloneParent,
        appendTo: destinationParent,
        childIndex: 0,
        cloningContent: false,
      });
    } else {
      destinationParent.appendChild(clonedChild);
    }
  }

  return cloned;
}

function throwCloneGraphError(): never {
  throw new Error('Cannot clone a cyclic or repeated node graph');
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

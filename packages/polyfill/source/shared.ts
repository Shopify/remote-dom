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
} from './constants.ts';
import type {Document} from './Document.ts';
import type {DocumentFragment} from './DocumentFragment.ts';
import type {Node} from './Node.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import type {CharacterData} from './CharacterData.ts';
import type {Text} from './Text.ts';
import {
  MATCHER_ELEMENT,
  MATCHER_ID,
  MATCHER_UNKNOWN,
  querySelector,
  querySelectorAll,
} from './selectors.ts';

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

  return querySelectorAll(within, [
    {type: name === '*' ? MATCHER_UNKNOWN : MATCHER_ELEMENT, name},
  ]);
}

export function descendants(node: Node) {
  const nodes: Node[] = [];
  const walk = (node: Node) => {
    nodes.push(node);
    const child = node[CHILD];
    if (child) walk(child);
    const sibling = node[NEXT];
    if (sibling) walk(sibling);
  };
  const child = node[CHILD];
  if (child) walk(child);
  return nodes;
}

export function selfAndDescendants(node: Node) {
  const nodes = descendants(node);
  nodes.unshift(node);
  return nodes;
}

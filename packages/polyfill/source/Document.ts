import {NS, NAME, NamespaceURI, NodeType, OWNER_DOCUMENT} from './constants.ts';
import type {Window} from './Window.ts';
import type {Node} from './Node.ts';
import {Event} from './Event.ts';
import {ParentNode} from './ParentNode.ts';
import {Element} from './Element.ts';
import {SVGElement} from './SVGElement.ts';
import {Text} from './Text.ts';
import {Comment} from './Comment.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {isParentNode, cloneNode} from './shared.ts';

export class Document extends ParentNode {
  nodeType = NodeType.DOCUMENT_NODE;
  [NAME] = '#document';

  constructor(public defaultView: Window) {
    super();
    this[OWNER_DOCUMENT] = this;
  }

  createElement(localName: string) {
    const lowerName = String(localName).toLowerCase();

    if (lowerName === 'template') {
      return createElement(new HTMLTemplateElement(), this, 'template');
    }

    const CustomElement = this.defaultView.customElements.get(localName);

    if (CustomElement) {
      return createElement(new CustomElement() as any, this, localName);
    } else {
      return createElement(new Element(), this, localName);
    }
  }

  createElementNS(localName: string, namespaceURI?: NamespaceURI) {
    if (namespaceURI === NamespaceURI.SVG) {
      return createElement(new SVGElement(), this, localName);
    }

    return createElement(new Element(), this, localName, namespaceURI);
  }

  createTextNode(data: any) {
    return createNode(new Text(data), this);
  }

  createComment(data: any) {
    return createNode(new Comment(data), this);
  }

  createDocumentFragment() {
    return createNode(new DocumentFragment(), this);
  }

  createEvent() {
    return new Event('');
  }

  importNode(node: Node, deep?: boolean) {
    return cloneNode(node, deep, this);
  }

  adoptNode(node: Node) {
    if (node[OWNER_DOCUMENT] === this) return node;

    node.parentNode?.removeChild(node);
    adoptNode(node, this);

    return node;
  }
}

export function createNode<T extends Node>(node: T, ownerDocument: Document) {
  Object.defineProperty(node, OWNER_DOCUMENT, {
    value: ownerDocument,
    writable: true,
    enumerable: false,
  });

  return node;
}

export function createElement<T extends Element>(
  element: T,
  ownerDocument: Document,
  name: string,
  namespace?: NamespaceURI,
) {
  createNode(element, ownerDocument);

  Object.defineProperty(element, NAME, {value: name});

  if (namespace) {
    Object.defineProperty(element, NS, {value: namespace});
  }

  return element;
}

export function adoptNode(node: Node, document: Document) {
  node[OWNER_DOCUMENT] = document;

  if (isParentNode(node)) {
    for (const child of node.childNodes) {
      adoptNode(child, document);
    }
  }
}

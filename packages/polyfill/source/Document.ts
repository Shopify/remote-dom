import {
  NS,
  NAME,
  NODE_TYPE_DOCUMENT,
  SVG_NAMESPACE,
  type NamespaceURI,
  type NodeType,
  OWNER_DOCUMENT,
  HOOKS,
  IS_CONNECTED,
} from './constants.ts';
import type {Window} from './Window.ts';
import type {Node} from './Node.ts';
import {getElementsByClassName as findElementsByClassName} from './getElementsByClassName.ts';
import {Event} from './Event.ts';
import {ParentNode} from './ParentNode.ts';
import {Element} from './Element.ts';
import {HTMLElement} from './HTMLElement.ts';
import {SVGElement} from './SVGElement.ts';
import {Text} from './Text.ts';
import {Comment} from './Comment.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {
  isParentNode,
  cloneNode,
  getElementById as findElementById,
  getElementsByTagName as findElementsByTagName,
} from './shared.ts';
import {HTMLBodyElement} from './HTMLBodyElement.ts';
import {HTMLHeadElement} from './HTMLHeadElement.ts';
import {HTMLHtmlElement} from './HTMLHtmlElement.ts';

export class Document extends ParentNode {
  nodeType: NodeType = NODE_TYPE_DOCUMENT;
  [NAME] = '#document';
  body: HTMLBodyElement;
  head: HTMLHeadElement;
  documentElement: HTMLHtmlElement;
  defaultView: Window;
  [IS_CONNECTED] = true;

  constructor(defaultView: Window) {
    super();
    this.defaultView = defaultView;
    this[OWNER_DOCUMENT] = this;
    this.documentElement = setupElement(new HTMLHtmlElement(), this, 'html');
    this.body = setupElement(new HTMLBodyElement(), this, 'body');
    this.head = setupElement(new HTMLHeadElement(), this, 'head');

    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  getElementsByClassName(classNames: string) {
    return findElementsByClassName(this, classNames);
  }

  createElement<T extends HTMLElement = HTMLElement>(localName: string) {
    return createElement<T>(this, localName);
  }

  createElementNS<T extends Element = Element>(
    namespaceURI: NamespaceURI,
    localName: string,
  ) {
    return createElement<T>(this, localName, namespaceURI);
  }

  createTextNode(data: any) {
    const text = createNode(new Text(data), this);
    this[HOOKS].createText?.(text as any, String(data));
    return text;
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

  getElementById(elementId: string) {
    return findElementById(this, elementId);
  }

  getElementsByTagName(qualifiedName: string) {
    return findElementsByTagName(this, qualifiedName);
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
  ownerDocument: Document,
  name: string,
  namespace?: NamespaceURI,
) {
  let element: T;
  const lowerName = String(name).toLowerCase();

  if (namespace === SVG_NAMESPACE) {
    element = new SVGElement() as any;
  } else if (lowerName === 'template') {
    element = new HTMLTemplateElement() as any;
  } else {
    const CustomElement = ownerDocument.defaultView.customElements.get(name);
    element = CustomElement ? (new CustomElement() as any) : new HTMLElement();
  }

  return setupElement(element, ownerDocument, name, namespace);
}

export function setupElement<T extends Element>(
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

  ownerDocument[HOOKS].createElement?.(element as any, namespace);

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

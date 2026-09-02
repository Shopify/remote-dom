import {
  NS,
  NAME,
  PREFIX,
  NODE_TYPE_DOCUMENT,
  HTML_NAMESPACE,
  SVG_NAMESPACE,
  type NamespaceURI,
  type NodeType,
  OWNER_DOCUMENT,
  HOOKS,
  IS_CONNECTED,
  CREATE_ELEMENT,
  asciiLowercase,
} from './constants.ts';
import {
  validateAndExtractQualifiedName,
  validateElementLocalName,
} from './names.ts';
import type {Window} from './Window.ts';
import type {Node} from './Node.ts';
import {getElementsByClassName as findElementsByClassName} from './getElementsByClassName.ts';
import {Event} from './Event.ts';
import {ParentNode} from './ParentNode.ts';
import {Element} from './Element.ts';
import {SVGElement} from './SVGElement.ts';
import {Text} from './Text.ts';
import {Comment} from './Comment.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {
  adoptNodes,
  cloneNode,
  collectAdoptionSnapshot,
  createNotSupportedError,
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

  get textContent(): string | null {
    return null;
  }

  set textContent(_data: any) {}

  getElementsByClassName(classNames: string) {
    return findElementsByClassName(this, classNames);
  }

  createElement(localName: string) {
    const name = String(localName);
    validateElementLocalName(name);
    return createElement(this, asciiLowercase(name));
  }

  createElementNS(namespaceURI: NamespaceURI, qualifiedName: string) {
    const name = validateAndExtractQualifiedName(
      namespaceURI,
      qualifiedName,
      'element',
    );
    return createElement(
      this,
      name.qualifiedName,
      name.namespace,
      name.prefix,
      name.localName,
    );
  }

  [CREATE_ELEMENT](
    qualifiedName: string,
    namespace: NamespaceURI,
    prefix: string | null,
    localName: string,
  ) {
    return createElement(this, qualifiedName, namespace, prefix, localName);
  }

  createTextNode(data: any) {
    const text = createNode(new Text(data), this);
    this[HOOKS].createText?.(text as any, text.data);
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
    if (node.nodeType === NODE_TYPE_DOCUMENT) {
      throw createNotSupportedError('Cannot import a document node');
    }

    return cloneNode(node, deep, this);
  }

  adoptNode(node: Node) {
    if (node[OWNER_DOCUMENT] === this) return node;

    const adoption = collectAdoptionSnapshot(node);
    node.parentNode?.removeChild(node);
    adoptNodes(adoption.nodes, this);

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
  qualifiedName: string,
  namespace: NamespaceURI = HTML_NAMESPACE,
  prefix: string | null = null,
  localName = qualifiedName,
) {
  let element: T;

  if (namespace === SVG_NAMESPACE) {
    element = new SVGElement() as any;
  } else if (namespace === HTML_NAMESPACE && localName === 'template') {
    element = new HTMLTemplateElement() as any;
  } else if (namespace === HTML_NAMESPACE) {
    const CustomElement =
      ownerDocument.defaultView.customElements.get(localName);
    element = CustomElement ? (new CustomElement() as any) : new Element();
  } else {
    element = new Element() as any;
  }

  return setupElement(element, ownerDocument, qualifiedName, namespace, prefix);
}

export function setupElement<T extends Element>(
  element: T,
  ownerDocument: Document,
  qualifiedName: string,
  namespace: NamespaceURI = HTML_NAMESPACE,
  prefix: string | null = null,
) {
  createNode(element, ownerDocument);

  Object.defineProperties(element, {
    [NAME]: {value: qualifiedName},
    [NS]: {value: namespace},
    [PREFIX]: {value: prefix},
  });

  ownerDocument[HOOKS].createElement?.(element as any, namespace);

  return element;
}

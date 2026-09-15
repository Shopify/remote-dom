import {
  NS,
  ATTRIBUTES,
  HOOKS,
  HTML_NAMESPACE,
  NODE_TYPE_ELEMENT,
  type NamespaceURI,
  type NodeType,
} from './constants.ts';
import {ParentNode} from './ParentNode.ts';
import {getElementsByClassName as findElementsByClassName} from './getElementsByClassName.ts';
import {NamedNodeMap} from './NamedNodeMap.ts';
import {Attr} from './Attr.ts';
import {serializeNode, serializeChildren, parseHtml} from './serialization.ts';
import {getElementsByTagName as findElementsByTagName} from './shared.ts';

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  nodeType: NodeType = NODE_TYPE_ELEMENT;

  [NS]: NamespaceURI = HTML_NAMESPACE;
  get namespaceURI() {
    return this[NS];
  }

  get tagName() {
    return this.nodeName;
  }

  [ATTRIBUTES]!: NamedNodeMap;

  [anyProperty: string]: any;

  get id() {
    return this.getAttribute('id') ?? '';
  }

  set id(id: string) {
    this.setAttribute('id', String(id));
  }

  get slot() {
    return this.getAttribute('slot') ?? '';
  }

  set slot(slot: string) {
    const finalSlot = String(slot);

    if (this.getAttribute('slot') !== finalSlot) {
      this.attributes.setNamedItem(new Attr('slot', finalSlot));
    }
  }

  get attributes() {
    let attributes = this[ATTRIBUTES];
    if (!attributes) {
      attributes = new NamedNodeMap(this);
      this[ATTRIBUTES] = attributes;
    }
    return attributes;
  }

  getAttributeNames() {
    return [...this.attributes].map((attr) => attr.name);
  }

  getElementsByTagName(qualifiedName: string) {
    return findElementsByTagName(this, qualifiedName);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  getElementsByClassName(classNames: string) {
    return findElementsByClassName(this, classNames);
  }

  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null;
  }

  get nextElementSibling() {
    let sib = this.nextSibling;
    while (sib && sib.nodeType !== 1) sib = sib.nextSibling;
    return sib;
  }

  get previousElementSibling() {
    let sib = this.previousSibling;
    while (sib && sib.nodeType !== 1) sib = sib.previousSibling;
    return sib;
  }

  focus(...args: [options?: FocusOptions]) {
    this[HOOKS].callMethod?.(this as any, 'focus', ...args);
  }

  scrollIntoView(...args: [arg?: boolean | ScrollIntoViewOptions]) {
    this[HOOKS].callMethod?.(this as any, 'scrollIntoView', ...args);
  }

  setAttribute(name: string, value: string) {
    this.attributes.setNamedItem(new Attr(name, String(value)));
  }

  setAttributeNS(namespace: NamespaceURI | null, name: string, value: string) {
    this.attributes.setNamedItemNS(new Attr(name, String(value), namespace));
  }

  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  getAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  hasAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  removeAttributeNS(namespace: NamespaceURI | null, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  get outerHTML() {
    return serializeNode(this);
  }

  get innerHTML() {
    return serializeChildren(this);
  }

  set innerHTML(html: any) {
    if (html == null || html === '') {
      this.replaceChildren();
    } else {
      const fragment = parseHtml(String(html), this);
      this.replaceChildren(fragment);
    }
  }
}

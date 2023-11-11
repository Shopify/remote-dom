import {NS, SLOT, ATTRIBUTES, NamespaceURI, NodeType} from './constants.ts';
import {ParentNode} from './ParentNode.ts';
import {NamedNodeMap} from './NamedNodeMap.ts';
import {Attr} from './Attr.ts';
import {serializeNode, serializeChildren, parseHtml} from './serialization.ts';

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  nodeType = NodeType.ELEMENT_NODE;

  [NS] = NamespaceURI.XHTML;
  [SLOT] = '';
  get namespaceURI() {
    return this[NS];
  }

  get tagName() {
    return this.nodeName;
  }

  [ATTRIBUTES]!: NamedNodeMap;

  attributeChangedCallback?: (
    name: string,
    oldValue: unknown,
    newValue: unknown,
  ) => void;

  [anyProperty: string]: any;

  get slot() {
    return this[SLOT];
  }

  set slot(slot: string) {
    const finalSlot = String(slot);
    this[SLOT] = finalSlot;
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

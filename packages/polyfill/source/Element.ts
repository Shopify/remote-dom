import {
  NS,
  NAME,
  PREFIX,
  ATTRIBUTES,
  HTML_NAMESPACE,
  NODE_TYPE_ELEMENT,
  type NamespaceURI,
  type NodeType,
  asciiLowercase,
  asciiUppercase,
} from './constants.ts';
import {
  validateAndExtractQualifiedName,
  validateAttributeLocalName,
} from './names.ts';
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
  [PREFIX]: string | null = null;

  get namespaceURI() {
    return this[NS];
  }

  get prefix() {
    return this[PREFIX];
  }

  get localName() {
    const prefix = this[PREFIX];
    return prefix == null ? this[NAME] : this[NAME].slice(prefix.length + 1);
  }

  get nodeName() {
    return this[NS] === HTML_NAMESPACE
      ? asciiUppercase(this[NAME])
      : this[NAME];
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

  get firstElementChild(): Element | null {
    return this.children[0] ?? null;
  }

  getElementsByClassName(classNames: string) {
    return findElementsByClassName(this, classNames);
  }

  get lastElementChild(): Element | null {
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

  setAttribute(name: string, value: string) {
    const qualifiedName = String(name);
    validateAttributeLocalName(qualifiedName);
    const normalizedName =
      this[NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;
    const normalizedValue = String(value);
    const attribute = this.attributes.getNamedItem(normalizedName);

    if (attribute) {
      attribute.value = normalizedValue;
    } else {
      this.attributes.setNamedItem(new Attr(normalizedName, normalizedValue));
    }
  }

  setAttributeNS(
    namespace: NamespaceURI,
    qualifiedName: string,
    value: string,
  ) {
    const name = validateAndExtractQualifiedName(
      namespace,
      qualifiedName,
      'attribute',
    );
    const normalizedValue = String(value);
    const attribute = this.attributes.getNamedItemNS(
      name.namespace,
      name.localName,
    );

    if (attribute) {
      attribute.value = normalizedValue;
    } else {
      this.attributes.setNamedItemNS(
        new Attr(name.qualifiedName, normalizedValue, name.namespace),
      );
    }
  }

  toggleAttribute(name: string, force?: boolean) {
    const qualifiedName = String(name);
    validateAttributeLocalName(qualifiedName);
    const normalizedName =
      this[NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;
    const attribute = this.attributes.getNamedItem(normalizedName);
    const normalizedForce = force === undefined ? undefined : Boolean(force);

    if (attribute == null) {
      if (normalizedForce === false) return false;
      this.attributes.setNamedItem(new Attr(normalizedName, ''));
      return true;
    }

    if (normalizedForce === true) return true;
    this.attributes.removeNamedItem(normalizedName);
    return false;
  }

  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  getAttributeNS(namespace: NamespaceURI, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  hasAttributeNS(namespace: NamespaceURI, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  removeAttributeNS(namespace: NamespaceURI, name: string) {
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

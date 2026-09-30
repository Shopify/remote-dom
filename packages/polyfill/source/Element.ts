import {
  NS,
  NAME,
  PREFIX,
  ATTRIBUTES,
  CLASS_LIST,
  DATASET,
  OWNER_ELEMENT,
  VALUE,
  HTML_NAMESPACE,
  NODE_TYPE_ELEMENT,
  type NamespaceURI,
  type NodeType,
  asciiLowercase,
  asciiUppercase,
  splitOnASCIIWhitespace,
} from './constants.ts';
import {
  normalizeNamespace,
  validateAndExtractQualifiedName,
  validateAttributeLocalName,
} from './names.ts';
import {ParentNode} from './ParentNode.ts';
import {NamedNodeMap} from './NamedNodeMap.ts';
import {Attr} from './Attr.ts';
import {serializeNode, serializeChildren, parseHtml} from './serialization.ts';
import {
  getElementsByClassName as findElementsByClassName,
  getElementsByTagName as findElementsByTagName,
} from './shared.ts';
import {matchesSelector} from './selectors.ts';
import {createDOMException} from './dom-exception.ts';

function toDataAttributeName(name: string) {
  return 'data-' + asciiLowercase(name.replace(/[A-Z]/g, '-$&'));
}

function toDataPropertyName(name: string) {
  return name
    .slice('data-'.length)
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function isValidDataPropertyName(name: string) {
  return !/-[a-z]/.test(name);
}

function validateDataPropertyName(name: string) {
  if (!isValidDataPropertyName(name)) {
    throw createDOMException(
      'The dataset property name must not contain a dash followed by an ASCII lowercase letter.',
      'SyntaxError',
    );
  }
}

function isTokenIndex(name: PropertyKey) {
  return typeof name === 'string' && name === String(+name);
}

function validateTokens(token: string, otherToken?: string) {
  if (token === '' || otherToken === '') {
    throw createDOMException(
      'The token provided must not be empty.',
      'SyntaxError',
    );
  }

  if (
    /[\t\n\f\r ]/.test(token) ||
    (otherToken !== undefined && /[\t\n\f\r ]/.test(otherToken))
  ) {
    throw createDOMException(
      'The token provided contains ASCII whitespace, which is not valid in tokens.',
      'InvalidCharacterError',
    );
  }
}

function normalizeTokens(tokens: string[]) {
  // Convert every argument before validation so conversion side effects and
  // errors still occur when an earlier token is invalid.
  for (let index = 0; index < tokens.length; index++) {
    tokens[index] = String(tokens[index]);
  }

  for (const token of tokens) {
    validateTokens(token);
  }

  return tokens;
}

class DOMTokenList {
  readonly [index: number]: string;
  [OWNER_ELEMENT]: Element;

  constructor(element: Element) {
    this[OWNER_ELEMENT] = element;
  }

  get [VALUE]() {
    return [...new Set(splitOnASCIIWhitespace(this[OWNER_ELEMENT].className))];
  }

  get length() {
    return this[VALUE].length;
  }

  get value() {
    return this[OWNER_ELEMENT].className;
  }

  set value(value: string) {
    this[OWNER_ELEMENT].className = String(value);
  }

  item(index: number) {
    return this[VALUE][index] ?? null;
  }

  contains(token: string) {
    return this[VALUE].includes(String(token));
  }

  add(...tokens: string[]) {
    const normalizedTokens = normalizeTokens(tokens);
    this.value = [...new Set([...this[VALUE], ...normalizedTokens])].join(' ');
  }

  remove(...tokens: string[]) {
    const removed = new Set(normalizeTokens(tokens));
    this.value = this[VALUE].filter((token) => !removed.has(token)).join(' ');
  }

  toggle(token: string, force?: boolean) {
    const normalizedToken = String(token);
    validateTokens(normalizedToken);
    const tokens = this[VALUE];
    const present = tokens.includes(normalizedToken);
    const next = force === undefined ? !present : Boolean(force);

    if (next !== present) {
      this.value = next
        ? [...tokens, normalizedToken].join(' ')
        : tokens.filter((token) => token !== normalizedToken).join(' ');
    }

    return next;
  }

  replace(token: string, newToken: string) {
    const normalizedToken = String(token);
    const normalizedNewToken = String(newToken);
    validateTokens(normalizedToken, normalizedNewToken);
    const tokens = this[VALUE];
    const index = tokens.indexOf(normalizedToken);
    if (index < 0) return false;

    tokens[index] = normalizedNewToken;
    this.value = [...new Set(tokens)].join(' ');
    return true;
  }

  toString() {
    return this.value;
  }

  [Symbol.iterator]() {
    return this[VALUE][Symbol.iterator]();
  }
}

Object.setPrototypeOf(
  DOMTokenList.prototype,
  new Proxy(
    {},
    {
      get(target, name, receiver) {
        return isTokenIndex(name)
          ? (receiver as DOMTokenList)[VALUE][+(name as string)]
          : Reflect.get(target, name, receiver);
      },
      set(target, name, value, receiver) {
        return isTokenIndex(name) || Reflect.set(target, name, value, receiver);
      },
    },
  ),
);

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

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', String(value));
  }

  [CLASS_LIST]?: DOMTokenList;

  get classList() {
    return (this[CLASS_LIST] ??= new DOMTokenList(this));
  }

  [DATASET]?: DOMStringMap;

  get dataset(): DOMStringMap {
    return (this[DATASET] ??= new Proxy({} as DOMStringMap, {
      get: (target, name) =>
        typeof name === 'string' && isValidDataPropertyName(name)
          ? (this.getAttribute(toDataAttributeName(name)) ??
            Reflect.get(target, name))
          : Reflect.get(target, name),
      set: (target, name, value) => {
        if (typeof name !== 'string') return Reflect.set(target, name, value);
        validateDataPropertyName(name);
        this.setAttribute(toDataAttributeName(name), String(value));
        return true;
      },
      deleteProperty: (target, name) => {
        if (typeof name !== 'string') {
          return Reflect.deleteProperty(target, name);
        }
        if (!isValidDataPropertyName(name)) return true;
        this.removeAttribute(toDataAttributeName(name));
        return true;
      },
      defineProperty: (target, name, descriptor) => {
        if (typeof name !== 'string') {
          return Reflect.defineProperty(target, name, descriptor);
        }
        if ('get' in descriptor || 'set' in descriptor) return false;
        validateDataPropertyName(name);
        this.setAttribute(toDataAttributeName(name), String(descriptor.value));
        return true;
      },
      preventExtensions: () => false,
      has: (target, name) =>
        Reflect.has(target, name) ||
        (typeof name === 'string' &&
          isValidDataPropertyName(name) &&
          this.hasAttribute(toDataAttributeName(name))),
      ownKeys: (target) => [
        ...this.getAttributeNames()
          .filter(
            (name) =>
              name.startsWith('data-') &&
              toDataAttributeName(toDataPropertyName(name)) === name,
          )
          .map(toDataPropertyName),
        ...Reflect.ownKeys(target).filter((key) => typeof key !== 'string'),
      ],
      getOwnPropertyDescriptor: (target, name) => {
        if (typeof name !== 'string') {
          return Reflect.getOwnPropertyDescriptor(target, name);
        }
        if (!isValidDataPropertyName(name)) {
          return Reflect.getOwnPropertyDescriptor(target, name);
        }
        const value = this.getAttribute(toDataAttributeName(name));
        return value == null
          ? Reflect.getOwnPropertyDescriptor(target, name)
          : {value, writable: true, enumerable: true, configurable: true};
      },
    }));
  }

  [ATTRIBUTES]!: NamedNodeMap;

  [anyProperty: string]: any;

  get id() {
    return this.getAttributeNS(null, 'id') ?? '';
  }

  set id(id: string) {
    this.setAttribute('id', String(id));
  }

  get slot() {
    return this.getAttributeNS(null, 'slot') ?? '';
  }

  set slot(slot: string) {
    const finalSlot = String(slot);

    if (this.getAttributeNS(null, 'slot') !== finalSlot) {
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
    const normalizedValue = String(value);
    validateAttributeLocalName(qualifiedName);
    const normalizedName =
      this[NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;
    const attribute = this.attributes.getNamedItemNS(null, normalizedName);

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
    const normalizedNamespace = normalizeNamespace(namespace);
    const normalizedQualifiedName = String(qualifiedName);
    const normalizedValue = String(value);
    const name = validateAndExtractQualifiedName(
      normalizedNamespace,
      normalizedQualifiedName,
      'attribute',
    );
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
    const attribute = this.attributes.getNamedItemNS(null, normalizedName);
    const normalizedForce = force === undefined ? undefined : Boolean(force);

    if (attribute == null) {
      if (normalizedForce === false) return false;
      this.attributes.setNamedItem(new Attr(normalizedName, ''));
      return true;
    }

    if (normalizedForce === true) return true;
    this.attributes.removeNamedItemNS(null, normalizedName);
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
    const qualifiedName = String(name);
    const normalizedName =
      this[NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;
    this.attributes.removeNamedItemNS(null, normalizedName);
  }

  removeAttributeNS(namespace: NamespaceURI, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  matches(selector: string) {
    return matchesSelector(this, selector);
  }

  closest(selector: string) {
    let element: Element | null = this;

    while (element) {
      if (element.matches(selector)) return element;
      element = element.parentElement as Element | null;
    }

    return null;
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

import {
  CHILD,
  OWNER_ELEMENT,
  OWNER_DOCUMENT,
  NS,
  NEXT,
  type NamespaceURI,
  HOOKS,
} from './constants.ts';
import type {Attr} from './Attr.ts';
import type {Element} from './Element.ts';
import {
  attributeObserversActive,
  queueMutationRecord,
} from './MutationObserver.ts';
import {toPropertyIndex} from './shared.ts';

export class NamedNodeMap {
  readonly [index: number]: Attr;

  [CHILD]: Attr | null = null;
  [OWNER_ELEMENT]: Element;

  constructor(ownerElement: Element) {
    this[OWNER_ELEMENT] = ownerElement;
  }

  getNamedItem(name: string) {
    let attr = this[CHILD];
    while (attr) {
      if (attr.name === name) return attr;
      attr = attr[NEXT];
    }
    return null;
  }

  getNamedItemNS(namespaceURI: NamespaceURI | null, name: string) {
    let attr = this[CHILD];
    while (attr) {
      if (attr.name === name && attr[NS] == namespaceURI) {
        return attr;
      }
      attr = attr[NEXT];
    }
    return null;
  }

  item(index: number) {
    let attr = this[CHILD];
    let i = 0;
    while (attr) {
      if (i++ === index) return attr;
      attr = attr[NEXT];
    }
    return null;
  }

  get length() {
    let index = 0;
    let attr = this[CHILD];
    while (attr) {
      index++;
      attr = attr[NEXT];
    }
    return index;
  }

  removeNamedItem(name: string) {
    return removeNamedAttribute(this, name, false, null);
  }

  removeNamedItemNS(namespaceURI: NamespaceURI | null, name: string) {
    return removeNamedAttribute(this, name, true, namespaceURI);
  }

  setNamedItem(attr: Attr) {
    const ownerElement = this[OWNER_ELEMENT];
    const currentOwner = attr[OWNER_ELEMENT];
    if (currentOwner && currentOwner !== ownerElement) {
      throw new Error('The attribute is already in use by another element.');
    }

    let old = null;
    let child = this[CHILD];
    attr[OWNER_ELEMENT] = ownerElement;
    attr[OWNER_DOCUMENT] = ownerElement.ownerDocument;
    if (child == null) {
      this[CHILD] = attr;
      // return null;
    } else {
      let prev;
      while (child) {
        if (child.name === attr.name && child[NS] == attr[NS]) {
          old = child;
          if (child !== attr) {
            if (prev) prev[NEXT] = attr;
            else this[CHILD] = attr;
            attr[NEXT] = child[NEXT];
            child[NEXT] = null;
            child[OWNER_ELEMENT] = null;
          }
          break;
          // return child;
        }
        prev = child;
        child = child[NEXT];
      }
      if (prev) prev[NEXT] = attr;
      else this[CHILD] = attr;
      // return null;
    }

    // only invoke the protocol if the value changed
    if (!old || old.value !== attr.value) {
      if (attributeObserversActive) {
        queueMutationRecord({
          type: 'attributes',
          target: ownerElement,
          attributeName: attr.name,
          attributeNamespace: attr[NS],
          oldValue: old?.value ?? null,
        });
      }
      updateElementAttribute(
        ownerElement,
        attr.name,
        old?.value ?? null,
        attr.value,
      );

      ownerElement[HOOKS].setAttribute?.(
        ownerElement as any,
        attr.name,
        attr.value,
        attr[NS],
      );
    }

    return old;
  }

  setNamedItemNS(attr: Attr) {
    return this.setNamedItem(attr);
  }

  *[Symbol.iterator]() {
    let attr = this[CHILD];
    while (attr) {
      yield attr;
      attr = attr[NEXT];
    }
  }
}

// This provides ordinary indexed and named reads without proxying every map.
// Properties placed directly on a map or earlier in its prototype chain retain
// normal JavaScript precedence. Alternate Reflect receivers and full Web IDL
// reflection cannot be modeled by a shared prototype fallback.
const namedNodeMapPropertyFallback = new Proxy(
  {},
  {
    get(target, property, receiver) {
      const namedNodeMap = receiver as NamedNodeMap;
      const index = toPropertyIndex(property);

      if (index !== undefined) {
        const indexedAttribute = namedNodeMap.item(index);
        if (indexedAttribute) return indexedAttribute;
      }

      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      return typeof property === 'string'
        ? (namedNodeMap.getNamedItem(property) ?? undefined)
        : undefined;
    },
  },
);

Object.setPrototypeOf(NamedNodeMap.prototype, namedNodeMapPropertyFallback);

function removeNamedAttribute(
  attributes: NamedNodeMap,
  name: string,
  matchNamespace: boolean,
  namespaceURI: NamespaceURI | null,
) {
  const ownerElement = attributes[OWNER_ELEMENT];
  let attr = attributes[CHILD];
  let prev: Attr | null = null;

  while (attr) {
    if (attr.name === name && (!matchNamespace || attr[NS] == namespaceURI)) {
      if (prev) prev[NEXT] = attr[NEXT];
      else attributes[CHILD] = attr[NEXT];

      if (attributeObserversActive) {
        queueMutationRecord({
          type: 'attributes',
          target: ownerElement,
          attributeName: attr.name,
          attributeNamespace: attr[NS],
          oldValue: attr.value,
        });
      }
      attr[NEXT] = null;
      attr[OWNER_ELEMENT] = null;
      updateElementAttribute(ownerElement, attr.name, attr.value, null);
      ownerElement[HOOKS].removeAttribute?.(
        ownerElement as any,
        attr.name,
        attr[NS],
      );
      return attr;
    }

    prev = attr;
    attr = attr[NEXT];
  }

  return null;
}

function updateElementAttribute(
  element: Element,
  name: string,
  oldValue: string | null,
  newValue: string | null,
) {
  const {observedAttributes} = element.constructor as typeof Element;
  const {attributeChangedCallback} = element;

  if (name === 'slot') {
    element.slot = newValue ?? '';
  }

  if (
    attributeChangedCallback == null ||
    observedAttributes == null ||
    !observedAttributes.includes(name)
  ) {
    return;
  }

  return attributeChangedCallback.call(element, name, oldValue, newValue);
}

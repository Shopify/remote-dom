import {
  CHILD,
  OWNER_ELEMENT,
  OWNER_DOCUMENT,
  NS,
  NEXT,
  type NamespaceURI,
  HOOKS,
  HTML_NAMESPACE,
  asciiLowercase,
} from './constants.ts';
import {normalizeNamespace} from './names.ts';
import type {Attr} from './Attr.ts';
import type {Element} from './Element.ts';
import type {Document} from './Document.ts';
import {
  attributeObserversActive,
  queueMutationRecord,
} from './MutationObserver.ts';
import {performWithCustomElementReactions} from './custom-element-reactions.ts';
import {enqueueAttributeReaction} from './attribute-reactions.ts';
import {adoptNodes} from './shared.ts';

export class NamedNodeMap {
  [CHILD]: Attr | null = null;
  [OWNER_ELEMENT]: Element;

  constructor(ownerElement: Element) {
    this[OWNER_ELEMENT] = ownerElement;
  }

  getNamedItem(name: string) {
    const qualifiedName = String(name);
    const normalizedName =
      this[OWNER_ELEMENT][NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;

    let attr = this[CHILD];
    while (attr) {
      if (attr.name === normalizedName) return attr;
      attr = attr[NEXT];
    }
    return null;
  }

  getNamedItemNS(namespaceURI: NamespaceURI, localName: string) {
    const namespace = normalizeNamespace(namespaceURI);
    const normalizedLocalName = String(localName);

    let attr = this[CHILD];
    while (attr) {
      if (attr.localName === normalizedLocalName && attr[NS] === namespace) {
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
    const qualifiedName = String(name);
    const normalizedName =
      this[OWNER_ELEMENT][NS] === HTML_NAMESPACE
        ? asciiLowercase(qualifiedName)
        : qualifiedName;

    return performWithCustomElementReactions(() =>
      removeNamedItemImmediately(this, (attr) => attr.name === normalizedName),
    );
  }

  removeNamedItemNS(namespaceURI: NamespaceURI, localName: string) {
    const namespace = normalizeNamespace(namespaceURI);
    const normalizedLocalName = String(localName);

    return performWithCustomElementReactions(() =>
      removeNamedItemImmediately(
        this,
        (attr) =>
          attr.localName === normalizedLocalName && attr[NS] === namespace,
      ),
    );
  }

  setNamedItem(attr: Attr) {
    return performWithCustomElementReactions(() =>
      this.setNamedItemImmediately(attr),
    );
  }

  private setNamedItemImmediately(attr: Attr) {
    const ownerElement = this[OWNER_ELEMENT];
    const currentOwner = attr[OWNER_ELEMENT];

    if (currentOwner != null && currentOwner !== ownerElement) {
      const error = new Error(
        'The attribute is already in use by another element.',
      );
      error.name = 'InUseAttributeError';
      throw error;
    }

    let old = null;
    let child = this[CHILD];
    let prev: Attr | null = null;

    while (child) {
      if (child.localName === attr.localName && child[NS] === attr[NS]) {
        if (child === attr) return child;

        if (prev) prev[NEXT] = attr;
        else this[CHILD] = attr;
        attr[NEXT] = child[NEXT];
        child[NEXT] = null;
        old = child;
        break;
      }

      prev = child;
      child = child[NEXT];
    }

    if (old == null) {
      if (prev) prev[NEXT] = attr;
      else this[CHILD] = attr;
    }

    attr[OWNER_ELEMENT] = ownerElement;
    attr[OWNER_DOCUMENT] = ownerElement[OWNER_DOCUMENT];
    if (old) old[OWNER_ELEMENT] = null;

    const valueChanged = old == null || old.value !== attr.value;
    const qualifiedNameChanged = old != null && old.name !== attr.name;

    if (valueChanged && attributeObserversActive) {
      queueMutationRecord({
        type: 'attributes',
        target: ownerElement,
        attributeName: attr.name,
        attributeNamespace: attr[NS],
        oldValue: old?.value ?? null,
      });
    }

    if (qualifiedNameChanged) {
      ownerElement[HOOKS].removeAttribute?.(
        ownerElement as any,
        old!.name,
        old![NS],
      );
    }

    if (valueChanged || qualifiedNameChanged) {
      ownerElement[HOOKS].setAttribute?.(
        ownerElement as any,
        attr.name,
        attr.value,
        attr[NS],
      );
    }

    if (valueChanged) {
      enqueueAttributeReaction(
        ownerElement,
        attr.localName,
        old?.value ?? null,
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

function removeNamedItemImmediately(
  attributes: NamedNodeMap,
  matches: (attr: Attr) => boolean,
  destination?: Document,
) {
  const ownerElement = attributes[OWNER_ELEMENT];
  let attr = attributes[CHILD];
  let prev: typeof attr | null = null;

  while (attr != null) {
    if (matches(attr)) {
      const qualifiedName = attr.name;
      const localName = attr.localName;
      const namespace = attr[NS];
      const oldValue = attr.value;

      if (prev) prev[NEXT] = attr[NEXT];
      if (attributes[CHILD] === attr) attributes[CHILD] = attr[NEXT];
      attr[NEXT] = null;
      attr[OWNER_ELEMENT] = null;
      if (destination) adoptNodes([attr], destination);

      if (attributeObserversActive) {
        queueMutationRecord({
          type: 'attributes',
          target: ownerElement,
          attributeName: qualifiedName,
          attributeNamespace: namespace,
          oldValue,
        });
      }
      ownerElement[HOOKS].removeAttribute?.(
        ownerElement as any,
        qualifiedName,
        namespace,
      );
      enqueueAttributeReaction(
        ownerElement,
        localName,
        oldValue,
        null,
        namespace,
      );
      return attr;
    }

    prev = attr;
    attr = attr[NEXT];
  }

  return null;
}

/** @internal */
export function removeAttributeForAdoption(
  attributes: NamedNodeMap,
  attribute: Attr,
  destination: Document,
) {
  const removed = removeNamedItemImmediately(
    attributes,
    (candidate) => candidate === attribute,
    destination,
  );

  if (removed == null) {
    throw new Error(
      'The owner element does not contain the adopted attribute.',
    );
  }

  return removed;
}

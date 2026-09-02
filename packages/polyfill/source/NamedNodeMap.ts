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
import {
  enqueueCustomElementReaction,
  performWithCustomElementReactions,
} from './custom-element-reactions.ts';

export class NamedNodeMap {
  [CHILD]: Attr | null = null;
  [OWNER_ELEMENT]: Element;

  constructor(ownerElement: Element) {
    this[OWNER_ELEMENT] = ownerElement;
  }

  getNamedItem(name: string) {
    return this.getNamedItemNS(null, name);
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
    return this.removeNamedItemNS(null, name);
  }

  removeNamedItemNS(namespaceURI: NamespaceURI | null, name: string) {
    return performWithCustomElementReactions(() =>
      this.removeNamedItemNSImmediately(namespaceURI, name),
    );
  }

  private removeNamedItemNSImmediately(
    namespaceURI: NamespaceURI | null,
    name: string,
  ) {
    const ownerElement = this[OWNER_ELEMENT];
    let attr = this[CHILD];
    let prev: typeof attr | null = null;

    while (attr != null) {
      if (attr.name === name && attr[NS] == namespaceURI) {
        if (prev) prev[NEXT] = attr[NEXT];
        if (this[CHILD] === attr) this[CHILD] = attr[NEXT];
        const oldValue = attr.value;
        attr[NEXT] = null;
        attr[OWNER_ELEMENT] = null;

        if (attributeObserversActive) {
          queueMutationRecord({
            type: 'attributes',
            target: ownerElement,
            attributeName: attr.name,
            attributeNamespace: attr[NS],
            oldValue,
          });
        }
        ownerElement[HOOKS].removeAttribute?.(
          ownerElement as any,
          name,
          namespaceURI,
        );
        updateElementAttribute(ownerElement, attr.name, oldValue, null);
        return attr;
      }

      prev = attr;
      attr = attr[NEXT];
    }

    return null;
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
      if (child.name === attr.name && child[NS] == attr[NS]) {
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

      ownerElement[HOOKS].setAttribute?.(
        ownerElement as any,
        attr.name,
        attr.value,
        attr[NS],
      );

      updateElementAttribute(
        ownerElement,
        attr.name,
        old?.value ?? null,
        attr.value,
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

function updateElementAttribute(
  element: Element,
  name: string,
  oldValue: string | null,
  newValue: string | null,
) {
  const {observedAttributes} = element.constructor as typeof Element;
  const {attributeChangedCallback} = element;

  if (
    attributeChangedCallback == null ||
    observedAttributes == null ||
    !observedAttributes.includes(name)
  ) {
    return;
  }

  enqueueCustomElementReaction(() =>
    attributeChangedCallback.call(element, name, oldValue, newValue),
  );
}

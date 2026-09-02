import {
  NS,
  NEXT,
  VALUE,
  OWNER_ELEMENT,
  NAME,
  NODE_TYPE_ATTRIBUTE,
  type NamespaceURI,
  type NodeType,
  HOOKS,
} from './constants.ts';
import {Node} from './Node.ts';
import type {Element} from './Element.ts';
import {
  attributeObserversActive,
  queueMutationRecord,
} from './MutationObserver.ts';
import {enqueueAttributeReaction} from './attribute-reactions.ts';
import {performWithCustomElementReactions} from './custom-element-reactions.ts';

export class Attr extends Node {
  nodeType: NodeType = NODE_TYPE_ATTRIBUTE;
  [NS]: NamespaceURI = null;
  [NEXT]: Attr | null = null;
  [VALUE]: string;
  [OWNER_ELEMENT]: Element | null = null;

  constructor(name: string, value: string, namespace?: NamespaceURI) {
    super();
    this[NAME] = name;
    this[VALUE] = value;
    if (namespace) this[NS] = namespace;
  }

  get nodeName() {
    return this[NAME];
  }

  set nodeName(_readonly: string) {}
  get name() {
    return this[NAME];
  }

  set name(_readonly: string) {}

  get localName() {
    if (this[NS] == null) return this[NAME];

    const separator = this[NAME].indexOf(':');
    return separator < 0 ? this[NAME] : this[NAME].slice(separator + 1);
  }

  get prefix() {
    if (this[NS] == null) return null;

    const separator = this[NAME].indexOf(':');
    return separator < 0 ? null : this[NAME].slice(0, separator);
  }
  get value() {
    return this[VALUE];
  }

  set value(value: string) {
    const str = String(value);
    const ownerElement = this[OWNER_ELEMENT];

    if (!ownerElement) {
      this[VALUE] = str;
      return;
    }

    performWithCustomElementReactions(() => {
      const oldValue = this[VALUE];
      this[VALUE] = str;

      if (attributeObserversActive && oldValue !== str) {
        queueMutationRecord({
          type: 'attributes',
          target: ownerElement,
          attributeName: this[NAME],
          attributeNamespace: this[NS],
          oldValue,
        });
      }

      this[HOOKS].setAttribute?.(
        ownerElement as any,
        this[NAME],
        str,
        this[NS],
      );
      enqueueAttributeReaction(
        ownerElement,
        this.localName,
        oldValue,
        str,
        this[NS],
      );
    });
  }

  get nodeValue() {
    return this.value;
  }

  set nodeValue(value: string) {
    this.value = value;
  }

  get ownerElement() {
    return this[OWNER_ELEMENT];
  }

  get namespaceURI() {
    return this[NS];
  }

  get specified() {
    return true;
  }
}

import {
  NS,
  NEXT,
  VALUE,
  OWNER_ELEMENT,
  NAME,
  ID,
  CHANNEL,
  NamespaceURI,
  NodeType,
} from './constants';
import {Node} from './Node';
import type {Element} from './Element';

export class Attr extends Node {
  nodeType = NodeType.ATTRIBUTE_NODE;
  [NS]: NamespaceURI | null = null;
  [NEXT]: Attr | null = null;
  [VALUE]: string;
  [OWNER_ELEMENT]: Element | null = null;
  isConnected = false;

  constructor(name: string, value: string, namespace?: NamespaceURI | null) {
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
  get value() {
    return this[VALUE];
  }

  set value(value: string) {
    const str = String(value);
    this[VALUE] = str;
    const ownerElement = this[OWNER_ELEMENT];
    if (!ownerElement) return;
    const owner = ownerElement[ID];
    const channel = ownerElement[CHANNEL];
    if (owner !== undefined && channel) {
      channel.setAttribute(owner, this[NAME], str, this[NS]);
    }
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

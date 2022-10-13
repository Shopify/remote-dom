/* eslint-disable eqeqeq */
import {
  CHILD,
  OWNER_ELEMENT,
  NS,
  NEXT,
  ID,
  CHANNEL,
  NamespaceURI,
} from './constants';
import type {Attr} from './Attr';
import type {Element} from './Element';

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
    const ownerElement = this[OWNER_ELEMENT];
    const owner = ownerElement[ID];
    const channel = ownerElement[CHANNEL];
    let attr = this[CHILD];
    if (!attr) return null;
    if (attr.name === name && attr[NS] == namespaceURI) {
      this[CHILD] = attr[NEXT];
      if (owner !== undefined && channel) {
        channel.removeAttribute(owner, name, namespaceURI);
      }
      return attr;
    }
    let prev = attr;
    while ((attr = attr[NEXT])) {
      if (attr.name === name && attr[NS] == namespaceURI) {
        prev[NEXT] = attr[NEXT];
        if (owner !== undefined && channel) {
          channel.removeAttribute(owner, name, namespaceURI);
        }
        return attr;
      }
      prev = attr;
    }
    return null;
  }

  setNamedItem(attr: Attr) {
    const ownerElement = this[OWNER_ELEMENT];
    let old = null;
    let child = this[CHILD];
    attr[OWNER_ELEMENT] = ownerElement;
    if (child == null) {
      this[CHILD] = attr;
      // return null;
    } else {
      let prev;
      while (child) {
        if (child.name === attr.name && child[NS] == attr[NS]) {
          if (prev) prev[NEXT] = attr;
          else this[CHILD] = attr;
          attr[NEXT] = child[NEXT];
          child[NEXT] = null;
          old = child;
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
    const owner = ownerElement[ID];
    const channel = ownerElement[CHANNEL];
    if (owner !== undefined && channel && (!old || old.value !== attr.value)) {
      channel.setAttribute(owner, attr.name, attr.value, attr[NS]);
    }
    return old;
  }

  setNamedItemNS(attr: Attr) {
    return this.setNamedItem(attr);
  }
}

import {
  OWNER_DOCUMENT,
  NAME,
  PARENT,
  HOST,
  CHILD,
  PREV,
  NEXT,
  NODE_TYPE_ATTRIBUTE,
  NODE_TYPE_DOCUMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  NODE_TYPE_DOCUMENT_TYPE,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_NODE,
  XMLNS_NAMESPACE,
  type NodeType,
  HOOKS,
  HOOKS_DISPATCH,
  IS_CONNECTED,
} from './constants.ts';
import type {Attr} from './Attr.ts';
import type {Document} from './Document.ts';
import type {Element} from './Element.ts';
import type {ParentNode} from './ParentNode.ts';
import {EventTarget} from './EventTarget.ts';
import {normalizeNamespace} from './names.ts';
import {
  isCharacterData,
  isParentNode,
  isTextNode,
  cloneNode,
  descendants,
} from './shared.ts';

export class Node extends EventTarget {
  nodeType: NodeType = NODE_TYPE_NODE;

  [OWNER_DOCUMENT]!: Document;
  [NAME] = '';
  [PARENT]: ParentNode | null = null;
  [HOST]: Node | null = null;
  [CHILD]: Node | null = null;
  [PREV]: Node | null = null;
  [NEXT]: Node | null = null;
  [IS_CONNECTED] = false;

  protected get [HOOKS]() {
    return this[OWNER_DOCUMENT].defaultView[HOOKS_DISPATCH];
  }

  get localName() {
    return this[NAME];
  }

  get nodeName() {
    return this[NAME];
  }

  get ownerDocument() {
    return this[OWNER_DOCUMENT];
  }

  get isConnected() {
    return this[IS_CONNECTED];
  }

  isDefaultNamespace(namespace: string | null): boolean {
    return locateNamespace(this) === normalizeNamespace(namespace);
  }

  get parentNode() {
    return this[PARENT];
  }

  set parentNode(_readonly) {}

  get parentElement(): ParentNode | null {
    const parent = this[PARENT];
    if (!parent || parent.nodeType !== 1) return null;
    return parent;
  }

  set parentElement(_readonly) {}

  get previousSibling() {
    return this[PREV];
  }

  set previousSibling(_readonly) {}

  get nextSibling() {
    return this[NEXT];
  }

  set nextSibling(_readonly) {}

  get previousElementSibling() {
    let sib = this[PREV];
    while (sib && sib.nodeType !== 1) sib = sib[PREV];
    return sib;
  }

  set previousElementSibling(_readonly) {}

  get nextElementSibling() {
    let sib = this[NEXT];
    while (sib && sib.nodeType !== 1) sib = sib[NEXT];
    return sib;
  }

  set nextElementSibling(_readonly) {}

  get firstChild() {
    return this[CHILD];
  }

  set firstChild(_readonly) {}

  get lastChild() {
    let child = this[CHILD];
    while (child) {
      const next = child[NEXT];
      if (next == null) break;
      child = next;
    }
    return child;
  }

  set lastChild(_readonly) {}

  get nodeValue(): string | null {
    if (isCharacterData(this)) return this.data;
    return null;
  }

  set nodeValue(data: string | null | undefined) {
    if (isCharacterData(this)) this.data = data;
  }

  get textContent(): string | null {
    if (isCharacterData(this)) return this.data;
    let text = '';

    for (const node of descendants(this)) {
      if (isTextNode(node)) {
        text += node.data;
      }
    }

    return text;
  }

  set textContent(data: any) {
    if (isCharacterData(this)) {
      this.data = data;
    } else if (isParentNode(this)) {
      const text = data == null ? '' : String(data);
      if (text === '') {
        this.replaceChildren();
      } else {
        this.replaceChildren(text);
      }
    }
  }

  cloneNode(deep?: boolean) {
    return cloneNode(this, deep);
  }

  contains(node: Node | null) {
    let currentNode: Node | null = node;

    while (currentNode != null) {
      if (currentNode === this) return true;
      currentNode = currentNode.parentNode;
    }

    return false;
  }
}

function locateNamespace(node: Node | null): string | null {
  if (node == null) return null;

  switch (node.nodeType) {
    case NODE_TYPE_ELEMENT: {
      const element = node as Element;

      if (element.prefix == null && element.namespaceURI != null) {
        return element.namespaceURI;
      }

      const namespace = element.attributes.getNamedItemNS(
        XMLNS_NAMESPACE,
        'xmlns',
      );

      if (namespace != null && namespace.prefix == null) {
        return normalizeNamespace(namespace.value);
      }

      return locateNamespace(element.parentElement);
    }
    case NODE_TYPE_DOCUMENT:
      return locateNamespace((node as Document).documentElement);
    case NODE_TYPE_DOCUMENT_TYPE:
    case NODE_TYPE_DOCUMENT_FRAGMENT:
      return null;
    case NODE_TYPE_ATTRIBUTE:
      return locateNamespace((node as Attr).ownerElement);
    default:
      return locateNamespace(node.parentElement);
  }
}

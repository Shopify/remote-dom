import type {AbstractChannel} from '../protocol';

import {
  CHANNEL,
  OWNER_DOCUMENT,
  NAME,
  PARENT,
  CHILD,
  PREV,
  NEXT,
  GENERATE_ID,
  ID,
  DATA,
  NamespaceURI,
  NodeType,
} from './constants';
import type {Document} from './Document';
import type {ParentNode} from './ParentNode';
import type {CharacterData} from './CharacterData';
import type {Text} from './Text';
import {EventTarget} from './EventTarget';

// Internal Node ID's are global
let nodeId = 0;

function isCharacterData(node: Node): node is CharacterData {
  return DATA in node;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === NodeType.TEXT_NODE;
}

function isParentNode(node: Node): node is ParentNode {
  return 'appendChild' in node;
}

export class Node extends EventTarget {
  nodeType = NodeType.NODE;
  [CHANNEL]?: AbstractChannel;
  [OWNER_DOCUMENT]!: Document;
  [NAME] = '';
  [PARENT]: ParentNode | null = null;
  [CHILD]: Node | null = null;
  [PREV]: Node | null = null;
  [NEXT]: Node | null = null;

  constructor(ownerDocument?: Document) {
    super();
    Object.defineProperty(this, OWNER_DOCUMENT, {
      value: ownerDocument,
      writable: true,
    });
    const channel = ownerDocument?.[CHANNEL];
    Object.defineProperty(this, CHANNEL, {value: channel, writable: true});
  }

  [GENERATE_ID]() {
    this[ID] = ++nodeId;
    return nodeId;
  }

  get localName() {
    return this[NAME];
  }

  get nodeName() {
    return this[NAME].toUpperCase();
  }

  get ownerDocument() {
    return this[OWNER_DOCUMENT];
  }

  isDefaultNamespace(namespace: string) {
    return namespace === NamespaceURI.XHTML;
  }

  get parentNode() {
    return this[PARENT];
  }

  set parentNode(_readonly) {}

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
    function walk(node: Node) {
      if (isTextNode(node)) {
        text += node.data;
      }
      const child = node[CHILD];
      if (child) walk(child);
      const sibling = node[NEXT];
      if (sibling) walk(sibling);
    }
    walk(this);
    return text;
  }

  set textContent(data: any) {
    if (isCharacterData(this)) {
      this.data = data;
    } else if (isParentNode(this)) {
      let child;
      while ((child = this[CHILD])) {
        this.removeChild(child);
      }
      this.append(data);
    }
  }
}

import {NAME, NamespaceURI, NodeType, OWNER_DOCUMENT} from './constants';
import type {Window} from './Window';
import {Event} from './Event';
import {ParentNode} from './ParentNode';
import {Element} from './Element';
import {SVGElement} from './SVGElement';
import {Text} from './Text';
import {Comment} from './Comment';
import {DocumentFragment} from './DocumentFragment';
import {HTMLTemplateElement} from './HTMLTemplateElement';

export class Document extends ParentNode {
  nodeType = NodeType.DOCUMENT_NODE;
  [NAME] = '#document';

  constructor(public defaultView: Window) {
    super();
    this[OWNER_DOCUMENT] = this;
    // this.documentElement = this.createElement('html');
    // this.body = this.createElement('body');
    // this.documentElement.appendChild(this.body);
  }

  createElement(localName: string) {
    const lowerName = String(localName).toLowerCase();
    switch (lowerName) {
      case 'template':
        return new HTMLTemplateElement(this);
      default:
        return new Element(this, localName);
    }
  }

  createElementNS(localName: string, namespaceURI?: NamespaceURI) {
    if (namespaceURI === NamespaceURI.SVG) {
      return new SVGElement(this, localName);
    }
    return new Element(this, localName, namespaceURI);
  }

  createTextNode(data: any) {
    return new Text(data, this);
  }

  createComment(data: any) {
    return new Comment(data);
  }

  createDocumentFragment() {
    return new DocumentFragment();
  }

  createEvent() {
    return new Event('');
  }
}

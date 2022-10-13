import {NS, NamespaceURI} from './constants';
import type {Document} from './Document';
import {Element} from './Element';

export class SVGElement extends Element {
  [NS] = NamespaceURI.SVG;

  constructor(ownerDocument: Document, localName: string) {
    super(ownerDocument, localName);
  }

  get ownerSVGElement() {
    let root: SVGElement | null = null;
    let parent = this.parentNode;
    while (parent instanceof SVGElement) {
      root = parent;
      parent = parent.parentNode;
    }
    return root;
  }
}

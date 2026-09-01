import {NS, SVG_NAMESPACE, type NamespaceURI} from './constants.ts';
import {Element} from './Element.ts';

export class SVGElement extends Element {
  [NS]: NamespaceURI = SVG_NAMESPACE;

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

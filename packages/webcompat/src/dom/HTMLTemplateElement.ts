import {CONTENT} from './constants';
import type {Document} from './Document';
import {DocumentFragment} from './DocumentFragment';
import {Element} from './Element';
import {parseHtml, serializeChildren} from './serialization';

export class HTMLTemplateElement extends Element {
  [CONTENT]?: DocumentFragment;

  constructor(ownerDocument: Document) {
    super(ownerDocument, 'template');
  }

  get content() {
    let content = this[CONTENT];
    if (!content) {
      content = new DocumentFragment();
      this[CONTENT] = content;
    }
    return content;
  }

  set content(_) {}

  set innerHTML(html) {
    this.content.replaceChildren(parseHtml(String(html), this));
  }

  get innerHTML() {
    const content = this[CONTENT];
    return content ? serializeChildren(content) : '';
    // return Element.prototype.innerHTML.call(this.content);
  }
}

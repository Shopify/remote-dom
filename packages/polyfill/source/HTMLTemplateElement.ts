import {CONTENT} from './constants.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLElement} from './HTMLElement.ts';
import {parseHtml, serializeChildren} from './serialization.ts';

export class HTMLTemplateElement extends HTMLElement {
  [CONTENT]?: DocumentFragment;

  get content() {
    let content = this[CONTENT];
    if (!content) {
      content = this.ownerDocument.createDocumentFragment();
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
  }
}

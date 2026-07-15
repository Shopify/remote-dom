import {Window} from '../index.ts';

import {describe, it, expect, beforeEach} from 'vitest';

describe('NonElementParentNode.getElementById', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  describe('Document', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <article id="main-post">
          <h1 id="title">Main Title</h1>
          <div class="content">
            <p id="body">First paragraph</p>
          </div>
        </article>
      `;
    });

    it('finds an element anywhere in the document', () => {
      expect(document.getElementById('main-post')?.localName).toBe('article');
      expect(document.getElementById('title')?.textContent).toBe('Main Title');
      expect(document.getElementById('body')?.textContent).toBe(
        'First paragraph',
      );
    });

    it('returns null when no element has the id', () => {
      expect(document.getElementById('nonexistent')).toBeNull();
    });

    it('returns the first match in tree order when ids are duplicated', () => {
      document.body.innerHTML = `
        <div id="dupe"><span id="inner">first</span></div>
        <div id="dupe"><span>second</span></div>
      `;

      expect(document.getElementById('dupe')?.textContent).toBe('first');
    });

    it('matches the id literally rather than as a selector', () => {
      // The selector tokenizer has no escape handling, so an id that looks like
      // a compound selector must not be parsed as one.
      const ids = ['a.b', 'a b', 'a[b]', 'a:b', 'a#b'];

      for (const id of ids) {
        const element = document.createElement('div');
        element.setAttribute('id', id);
        document.body.appendChild(element);
      }

      for (const id of ids) {
        expect(document.getElementById(id)?.getAttribute('id')).toBe(id);
      }
    });

    it('finds elements added after the document was built', () => {
      const added = document.createElement('section');
      added.setAttribute('id', 'added');
      document.body.appendChild(added);

      expect(document.getElementById('added')).toBe(added);

      document.body.removeChild(added);

      expect(document.getElementById('added')).toBeNull();
    });
  });

  describe('DocumentFragment', () => {
    it('finds an element within the fragment', () => {
      const fragment = document.createDocumentFragment();
      const child = document.createElement('div');
      child.setAttribute('id', 'in-fragment');
      fragment.appendChild(child);

      expect(fragment.getElementById('in-fragment')).toBe(child);
      expect(fragment.getElementById('nonexistent')).toBeNull();
    });

    it('does not find elements that are only in the document', () => {
      const inDocument = document.createElement('div');
      inDocument.setAttribute('id', 'in-document');
      document.body.appendChild(inDocument);

      const fragment = document.createDocumentFragment();

      expect(fragment.getElementById('in-document')).toBeNull();
    });
  });
});

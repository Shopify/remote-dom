import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

let polyfillWindow: Window;
let polyfillDocument: Window['document'];

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
  polyfillDocument = polyfillWindow.document;
});

function defineCustomElement(
  name: string,
  Constructor: new () => PolyfillHTMLElement,
) {
  polyfillWindow.customElements.define(
    name,
    Constructor as unknown as CustomElementConstructor,
  );
}

describe('Document.textContent', () => {
  it('returns null for an initialized document', () => {
    expect(polyfillDocument.documentElement.parentNode).toBe(polyfillDocument);
    expect(polyfillDocument.head.parentNode).toBe(
      polyfillDocument.documentElement,
    );
    expect(polyfillDocument.body.parentNode).toBe(
      polyfillDocument.documentElement,
    );
    expect(polyfillDocument.textContent).toBeNull();
  });

  it.each(['replacement', '', null])(
    'ignores assignment of %j',
    (textContent) => {
      const {documentElement, head, body} = polyfillDocument;
      const hooks: string[] = [];

      polyfillWindow[HOOKS].createText = () => hooks.push('create');
      polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
      polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

      polyfillDocument.textContent = textContent;

      expect(polyfillDocument.documentElement).toBe(documentElement);
      expect(polyfillDocument.head).toBe(head);
      expect(polyfillDocument.body).toBe(body);
      expect([...polyfillDocument.childNodes]).toEqual([documentElement]);
      expect([...documentElement.childNodes]).toEqual([head, body]);
      expect(documentElement.parentNode).toBe(polyfillDocument);
      expect(head.parentNode).toBe(documentElement);
      expect(body.parentNode).toBe(documentElement);
      expect(documentElement.isConnected).toBe(true);
      expect(head.isConnected).toBe(true);
      expect(body.isConnected).toBe(true);
      expect(hooks).toEqual([]);
    },
  );

  it('preserves text content mutations for other parent nodes', () => {
    polyfillDocument.body.append('existing');

    polyfillDocument.body.textContent = 'replacement';

    expect(polyfillDocument.body.childNodes).toHaveLength(1);
    expect(polyfillDocument.body.firstChild?.localName).toBe('#text');
    expect(polyfillDocument.body.textContent).toBe('replacement');
  });
});

describe('Node.textContent parent mutations', () => {
  it('leaves an empty parent empty when assigned empty text', () => {
    const parent = polyfillDocument.createElement('div');
    const hooks: string[] = [];

    polyfillWindow[HOOKS].createText = () => hooks.push('create');
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    parent.textContent = '';

    expect(parent.childNodes).toHaveLength(0);
    expect(parent.firstChild).toBeNull();
    expect(hooks).toEqual([]);
  });

  it('clears a populated parent without creating an empty text node', () => {
    const parent = polyfillDocument.createElement('div');
    const first = polyfillDocument.createElement('span');
    const second = polyfillDocument.createTextNode('existing');
    parent.append(first, second);
    const mirroredChildren = [...parent.childNodes];
    const hooks: string[] = [];

    polyfillWindow[HOOKS].createText = () => hooks.push('create');
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = (_parent, child, index) => {
      hooks.push(`remove:${child.nodeName.toLowerCase()}`);
      mirroredChildren.splice(index, 1);
    };

    parent.textContent = '';

    expect(parent.childNodes).toHaveLength(0);
    expect(parent.firstChild).toBeNull();
    expect(first.parentNode).toBeNull();
    expect(second.parentNode).toBeNull();
    expect(mirroredChildren).toEqual([...parent.childNodes]);
    expect(hooks).toEqual(['remove:span', 'remove:#text']);
  });

  it('inserts text into an empty parent for a non-empty assignment', () => {
    const parent = polyfillDocument.createElement('div');
    const hooks: string[] = [];

    polyfillWindow[HOOKS].createText = (_text, data) =>
      hooks.push(`create:${data}`);
    polyfillWindow[HOOKS].insertChild = (_parent, child) =>
      hooks.push(`insert:${child.nodeName.toLowerCase()}`);

    parent.textContent = 'replacement';

    expect(parent.childNodes).toHaveLength(1);
    expect(parent.firstChild?.localName).toBe('#text');
    expect(parent.firstChild?.textContent).toBe('replacement');
    expect(hooks).toEqual(['create:replacement', 'insert:#text']);
  });

  it('replaces a populated parent with one text node', () => {
    const parent = polyfillDocument.createElement('div');
    const first = polyfillDocument.createElement('span');
    const second = polyfillDocument.createTextNode('existing');
    parent.append(first, second);
    const hooks: string[] = [];

    polyfillWindow[HOOKS].createText = (_text, data) =>
      hooks.push(`create:${data}`);
    polyfillWindow[HOOKS].insertChild = (_parent, child) =>
      hooks.push(`insert:${child.nodeName.toLowerCase()}`);
    polyfillWindow[HOOKS].removeChild = (_parent, child) =>
      hooks.push(`remove:${child.nodeName.toLowerCase()}`);

    parent.textContent = 'replacement';

    expect([...parent.childNodes]).toEqual([parent.firstChild]);
    expect(parent.firstChild?.localName).toBe('#text');
    expect(parent.firstChild?.textContent).toBe('replacement');
    expect(first.parentNode).toBeNull();
    expect(second.parentNode).toBeNull();
    expect(hooks).toEqual([
      'remove:span',
      'remove:#text',
      'create:replacement',
      'insert:#text',
    ]);
  });

  it('commits the full replacement before disconnected callbacks run', () => {
    const events: string[] = [];
    const callbackSnapshots: Array<{
      childCount: number;
      text: string | null;
      parentIsNull: boolean;
      connected: boolean;
    }> = [];
    const parent = polyfillDocument.createElement('div');

    class ObservingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        events.push(`callback:${this.localName}`);
        callbackSnapshots.push({
          childCount: parent.childNodes.length,
          text: parent.firstChild?.textContent ?? null,
          parentIsNull: this.parentNode === null,
          connected: this.isConnected,
        });
      }
    }

    defineCustomElement('observing-first', ObservingElement);
    defineCustomElement('observing-second', ObservingElement);
    const first = polyfillDocument.createElement('observing-first');
    const second = polyfillDocument.createElement('observing-second');
    parent.append(first, second);
    polyfillDocument.body.appendChild(parent);

    polyfillWindow[HOOKS].removeChild = (_parent, child) =>
      events.push(`hook:remove:${child.nodeName.toLowerCase()}`);
    polyfillWindow[HOOKS].createText = () => events.push('hook:create');
    polyfillWindow[HOOKS].insertChild = () => events.push('hook:insert');

    parent.textContent = 'replacement';

    expect(events).toEqual([
      'hook:remove:observing-first',
      'hook:remove:observing-second',
      'hook:create',
      'hook:insert',
      'callback:observing-first',
      'callback:observing-second',
    ]);
    expect(callbackSnapshots).toEqual([
      {
        childCount: 1,
        text: 'replacement',
        parentIsNull: true,
        connected: false,
      },
      {
        childCount: 1,
        text: 'replacement',
        parentIsNull: true,
        connected: false,
      },
    ]);
  });

  it('commits an empty tree before disconnected callbacks run', () => {
    const events: string[] = [];
    const callbackSnapshots: Array<{
      childCount: number;
      firstChildIsNull: boolean;
      parentIsNull: boolean;
      connected: boolean;
    }> = [];
    const parent = polyfillDocument.createElement('div');

    class ObservingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        events.push(`callback:${this.localName}`);
        callbackSnapshots.push({
          childCount: parent.childNodes.length,
          firstChildIsNull: parent.firstChild === null,
          parentIsNull: this.parentNode === null,
          connected: this.isConnected,
        });
      }
    }

    defineCustomElement('empty-observing-first', ObservingElement);
    defineCustomElement('empty-observing-second', ObservingElement);
    const first = polyfillDocument.createElement('empty-observing-first');
    const second = polyfillDocument.createElement('empty-observing-second');
    parent.append(first, second);
    polyfillDocument.body.appendChild(parent);

    polyfillWindow[HOOKS].removeChild = (_parent, child) =>
      events.push(`hook:remove:${child.nodeName.toLowerCase()}`);
    polyfillWindow[HOOKS].createText = () => events.push('hook:create');
    polyfillWindow[HOOKS].insertChild = () => events.push('hook:insert');

    parent.textContent = '';

    expect(events).toEqual([
      'hook:remove:empty-observing-first',
      'hook:remove:empty-observing-second',
      'callback:empty-observing-first',
      'callback:empty-observing-second',
    ]);
    expect(callbackSnapshots).toEqual([
      {
        childCount: 0,
        firstChildIsNull: true,
        parentIsNull: true,
        connected: false,
      },
      {
        childCount: 0,
        firstChildIsNull: true,
        parentIsNull: true,
        connected: false,
      },
    ]);
  });

  it('finishes replacing every child before rethrowing a callback error', () => {
    const error = new Error('disconnected callback failed');
    let secondCallbackSnapshot:
      | {childCount: number; text: string | null; connected: boolean}
      | undefined;
    const parent = polyfillDocument.createElement('div');

    class ThrowingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        throw error;
      }
    }

    class ObservingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        secondCallbackSnapshot = {
          childCount: parent.childNodes.length,
          text: parent.firstChild?.textContent ?? null,
          connected: this.isConnected,
        };
      }
    }

    defineCustomElement('throwing-text-child', ThrowingElement);
    defineCustomElement('observing-text-child', ObservingElement);
    const first = polyfillDocument.createElement('throwing-text-child');
    const second = polyfillDocument.createElement('observing-text-child');
    parent.append(first, second);
    polyfillDocument.body.appendChild(parent);

    expect(() => {
      parent.textContent = 'replacement';
    }).toThrow(error);

    expect(parent.childNodes).toHaveLength(1);
    expect(parent.firstChild?.localName).toBe('#text');
    expect(parent.firstChild?.textContent).toBe('replacement');
    expect(first.parentNode).toBeNull();
    expect(first.isConnected).toBe(false);
    expect(second.parentNode).toBeNull();
    expect(second.isConnected).toBe(false);
    expect(secondCallbackSnapshot).toEqual({
      childCount: 1,
      text: 'replacement',
      connected: false,
    });
  });
  it('finishes clearing every child before rethrowing a callback error', () => {
    const error = new Error('disconnected callback failed');
    let secondCallbackSnapshot:
      | {childCount: number; text: string | null; connected: boolean}
      | undefined;
    const parent = polyfillDocument.createElement('div');

    class ThrowingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        throw error;
      }
    }

    class ObservingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        secondCallbackSnapshot = {
          childCount: parent.childNodes.length,
          text: parent.firstChild?.textContent ?? null,
          connected: this.isConnected,
        };
      }
    }

    defineCustomElement('throwing-empty-child', ThrowingElement);
    defineCustomElement('observing-empty-child', ObservingElement);
    const first = polyfillDocument.createElement('throwing-empty-child');
    const second = polyfillDocument.createElement('observing-empty-child');
    parent.append(first, second);
    polyfillDocument.body.appendChild(parent);

    expect(() => {
      parent.textContent = '';
    }).toThrow(error);

    expect(parent.childNodes).toHaveLength(0);
    expect(parent.firstChild).toBeNull();
    expect(first.parentNode).toBeNull();
    expect(first.isConnected).toBe(false);
    expect(second.parentNode).toBeNull();
    expect(second.isConnected).toBe(false);
    expect(secondCallbackSnapshot).toEqual({
      childCount: 0,
      text: null,
      connected: false,
    });
  });
});

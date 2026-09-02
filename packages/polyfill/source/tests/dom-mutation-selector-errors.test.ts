import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS, Window} from '../index.ts';
import {createDOMException} from '../dom-exception.ts';
import {parseSelector} from '../selectors.ts';

let polyfillWindow: Window;

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
});

function expectDOMError(operation: () => unknown, name: string) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({name});
    return;
  }

  throw new Error(`Expected ${name}`);
}

describe('DOM mutation errors', () => {
  it('reports invalid child and reference nodes as NotFoundError without mutations', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const foreignParent = document.createElement('section');
    const foreignChild = document.createElement('em');
    parent.appendChild(child);
    foreignParent.appendChild(foreignChild);
    const mutations: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');

    expectDOMError(() => parent.removeChild(foreignChild), 'NotFoundError');
    expectDOMError(
      () => parent.insertBefore(foreignChild, foreignChild),
      'NotFoundError',
    );
    expectDOMError(
      () => parent.replaceChild(foreignChild, foreignChild),
      'NotFoundError',
    );

    expect([...parent.childNodes]).toEqual([child]);
    expect([...foreignParent.childNodes]).toEqual([foreignChild]);
    expect(child.parentNode).toBe(parent);
    expect(foreignChild.parentNode).toBe(foreignParent);
    expect(mutations).toEqual([]);
  });

  it('reports hierarchy violations as HierarchyRequestError without mutations', () => {
    const ancestor = document.createElement('section');
    const parent = document.createElement('div');
    const child = document.createElement('span');
    ancestor.appendChild(parent);
    parent.appendChild(child);
    const mutations: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');

    expectDOMError(
      () => parent.replaceChild(ancestor, child),
      'HierarchyRequestError',
    );

    expect([...ancestor.childNodes]).toEqual([parent]);
    expect([...parent.childNodes]).toEqual([child]);
    expect(parent.parentNode).toBe(ancestor);
    expect(child.parentNode).toBe(parent);
    expect(mutations).toEqual([]);
  });

  it('reports hierarchy errors before invalid reference errors', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const foreignParent = document.createElement('section');
    const foreignChild = document.createElement('em');
    parent.appendChild(child);
    foreignParent.appendChild(foreignChild);
    const mutations: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');

    expectDOMError(
      () => parent.insertBefore(parent, foreignChild),
      'HierarchyRequestError',
    );
    expectDOMError(
      () => parent.replaceChild(parent, foreignChild),
      'HierarchyRequestError',
    );

    expect([...parent.childNodes]).toEqual([child]);
    expect([...foreignParent.childNodes]).toEqual([foreignChild]);
    expect(parent.parentNode).toBeNull();
    expect(child.parentNode).toBe(parent);
    expect(foreignChild.parentNode).toBe(foreignParent);
    expect(mutations).toEqual([]);
  });

  it('validates host-including hierarchy before references and variadic commits', () => {
    const sourceWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = polyfillWindow.document;
    const holder = destinationDocument.createElement('div');
    const template = destinationDocument.createElement('template');
    const content = template.content;
    const foreignParent = destinationDocument.createElement('section');
    const foreignReference = destinationDocument.createElement('span');
    const sourceParent = sourceDocument.createElement('div');
    const movable = sourceDocument.createElement('atomic-host-node');
    let reactions = 0;
    (movable as any).connectedCallback = () => reactions++;
    (movable as any).disconnectedCallback = () => reactions++;
    holder.appendChild(template);
    foreignParent.appendChild(foreignReference);
    sourceDocument.body.appendChild(sourceParent);
    sourceParent.appendChild(movable);
    reactions = 0;

    const sourceHooks: string[] = [];
    const destinationHooks: string[] = [];
    sourceWindow[HOOKS] = {
      insertChild: () => sourceHooks.push('insert'),
      removeChild: () => sourceHooks.push('remove'),
    };
    polyfillWindow[HOOKS] = {
      insertChild: () => destinationHooks.push('insert'),
      removeChild: () => destinationHooks.push('remove'),
    };

    expectDOMError(
      () => content.insertBefore(template, foreignReference),
      'HierarchyRequestError',
    );
    expectDOMError(
      () => content.append(movable, template),
      'HierarchyRequestError',
    );

    expect([...holder.childNodes]).toEqual([template]);
    expect([...content.childNodes]).toEqual([]);
    expect([...foreignParent.childNodes]).toEqual([foreignReference]);
    expect([...sourceParent.childNodes]).toEqual([movable]);
    expect(template.parentNode).toBe(holder);
    expect(movable.parentNode).toBe(sourceParent);
    expect(movable.ownerDocument).toBe(sourceDocument);
    expect(sourceHooks).toEqual([]);
    expect(destinationHooks).toEqual([]);
    expect(reactions).toBe(0);
  });

  it.each([
    [
      'append',
      (parent: Element, child: Element) => parent.append(child, parent),
    ],
    [
      'prepend',
      (parent: Element, child: Element) => parent.prepend(child, parent),
    ],
    [
      'replaceChildren',
      (parent: Element, child: Element) =>
        parent.replaceChildren(child, parent),
    ],
    [
      'before',
      (parent: Element, child: Element) =>
        parent.firstElementChild!.before(child, parent),
    ],
    [
      'after',
      (parent: Element, child: Element) =>
        parent.firstElementChild!.after(child, parent),
    ],
    [
      'replaceWith',
      (parent: Element, child: Element) =>
        parent.firstElementChild!.replaceWith(child, parent),
    ],
  ])('validates every %s argument before changing state', (_name, mutate) => {
    const parent = document.createElement('div');
    const existing = document.createElement('span');
    const source = document.createElement('section');
    const movable = document.createElement('em');
    parent.appendChild(existing);
    source.appendChild(movable);
    const mutations: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');

    expectDOMError(() => mutate(parent, movable), 'HierarchyRequestError');

    expect([...parent.childNodes]).toEqual([existing]);
    expect([...source.childNodes]).toEqual([movable]);
    expect(existing.parentNode).toBe(parent);
    expect(movable.parentNode).toBe(source);
    expect(mutations).toEqual([]);
  });

  it.each([
    [
      'append',
      (parent: any, child: any, invalid: any) => parent.append(child, invalid),
    ],
    [
      'prepend',
      (parent: any, child: any, invalid: any) => parent.prepend(child, invalid),
    ],
    [
      'replaceChildren',
      (parent: any, child: any, invalid: any) =>
        parent.replaceChildren(child, invalid),
    ],
    [
      'before',
      (parent: any, child: any, invalid: any) =>
        parent.firstElementChild!.before(child, invalid),
    ],
    [
      'after',
      (parent: any, child: any, invalid: any) =>
        parent.firstElementChild!.after(child, invalid),
    ],
    [
      'replaceWith',
      (parent: any, child: any, invalid: any) =>
        parent.firstElementChild!.replaceWith(child, invalid),
    ],
  ])(
    'converts every %s argument before moving cross-document nodes',
    (_name, mutate) => {
      const sourceWindow = new Window();
      const sourceDocument = sourceWindow.document;
      const destinationDocument = polyfillWindow.document;
      const sourceParent = sourceDocument.createElement('section');
      const movable = sourceDocument.createElement('atomic-node');
      const parent = destinationDocument.createElement('div');
      const existing = destinationDocument.createElement('span');
      let reactions = 0;
      (movable as any).connectedCallback = () => reactions++;
      (movable as any).disconnectedCallback = () => reactions++;
      sourceDocument.body.appendChild(sourceParent);
      sourceParent.appendChild(movable);
      destinationDocument.body.appendChild(parent);
      parent.appendChild(existing);
      reactions = 0;

      const sourceHooks: string[] = [];
      const destinationHooks: string[] = [];
      sourceWindow[HOOKS] = {
        createText: () => sourceHooks.push('createText'),
        insertChild: () => sourceHooks.push('insert'),
        removeChild: () => sourceHooks.push('remove'),
      };
      polyfillWindow[HOOKS] = {
        createText: () => destinationHooks.push('createText'),
        insertChild: () => destinationHooks.push('insert'),
        removeChild: () => destinationHooks.push('remove'),
      };
      const conversionError = new Error('conversion failed');
      const invalid = {
        toString() {
          throw conversionError;
        },
      };

      expect(() => mutate(parent, movable, invalid)).toThrow(conversionError);

      expect([...parent.childNodes]).toEqual([existing]);
      expect([...sourceParent.childNodes]).toEqual([movable]);
      expect(existing.parentNode).toBe(parent);
      expect(movable.parentNode).toBe(sourceParent);
      expect(movable.ownerDocument).toBe(sourceDocument);
      expect(sourceHooks).toEqual([]);
      expect(destinationHooks).toEqual([]);
      expect(reactions).toBe(0);
    },
  );
});

describe('selector syntax errors', () => {
  it.each([
    '',
    '   ',
    '[data-open',
    ':has(.item',
    ':has([title="item])',
    'div)',
    'div, span',
    ':hover',
    ':HOVER',
    ':matches(div)',
    ':has(:hover)',
    'div >',
    'div >> span',
    '[data-kind^=item]',
  ])('reports malformed or unsupported %j as SyntaxError', (selector) => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));

    expectDOMError(() => parseSelector(selector), 'SyntaxError');
    expectDOMError(() => parent.querySelector(selector), 'SyntaxError');
    expectDOMError(() => parent.querySelectorAll(selector), 'SyntaxError');
  });

  it.each([
    '[data-kind="item]',
    '[data-kind=\'item"]',
    '[data-kind=item"value]',
    '[data-kind==item]',
    '[data-kind="item" junk]',
    '[data-kind=#item]',
  ])('reports malformed attribute selector %j as SyntaxError', (attribute) => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));

    for (const selector of [attribute, `:has(${attribute})`]) {
      expectDOMError(() => parseSelector(selector), 'SyntaxError');
      expectDOMError(() => parent.querySelector(selector), 'SyntaxError');
      expectDOMError(() => parent.querySelectorAll(selector), 'SyntaxError');
    }
  });
});

describe('DOMException fallback', () => {
  it('creates a named Error when the DOMException global is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'DOMException',
    );
    Object.defineProperty(globalThis, 'DOMException', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const error = createDOMException('Invalid tree', 'HierarchyRequestError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        message: 'Invalid tree',
        name: 'HierarchyRequestError',
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'DOMException', descriptor);
      } else {
        delete (globalThis as {DOMException?: typeof DOMException})
          .DOMException;
      }
    }
  });
});

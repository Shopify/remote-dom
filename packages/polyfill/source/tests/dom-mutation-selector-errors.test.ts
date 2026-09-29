import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS, Window} from '../index.ts';
import {PARENT} from '../constants.ts';
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
      (parent: Element, child: Element) => parent.append(child),
      (parent: Element, child: Element) => parent.appendChild(child),
    ],
    [
      'prepend',
      (parent: Element, child: Element) => parent.prepend(child),
      (parent: Element, child: Element) =>
        parent.insertBefore(child, parent.firstChild),
    ],
  ])(
    'does not add a second hierarchy walk for single-node %s',
    (_name, mutate, directMutation) => {
      const countParentReads = (
        operation: (parent: Element, child: Element) => unknown,
      ) => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        let parentReads = 0;
        Object.defineProperty(parent, PARENT, {
          configurable: true,
          get() {
            parentReads += 1;
            return null;
          },
        });

        operation(parent, child);
        expect(parent.firstElementChild).toBe(child);
        return parentReads;
      };

      expect(countParentReads(mutate)).toBe(countParentReads(directMutation));
    },
  );

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

describe('selector syntax errors and EOF recovery', () => {
  it.each(['div:has(span', 'div:not(.missing', 'div:has(> span'])(
    'recovers supported function selector %j at EOF',
    (selector) => {
      const root = document.createElement('section');
      root.innerHTML = '<div data-kind="item"><span></span></div>';
      const expected = root.firstElementChild;

      expect(() => parseSelector(selector)).not.toThrow();
      expect(root.querySelector(selector)).toBe(expected);
      expect(root.querySelectorAll(selector)).toEqual([expected]);
    },
  );

  it.each([
    ['[data-open', 'data-open', '', false],
    ['[data-kind=item', 'data-kind', 'item', false],
    ['[data-kind="item', 'data-kind', 'item', false],
    ['[data-kind="item]', 'data-kind', 'item]', false],
    ['[data-kind=\'item"]', 'data-kind', 'item"]', false],
    [':has([data-kind="item])', 'data-kind', 'item])', true],
    [':has([data-kind=\'item"])', 'data-kind', 'item"])', true],
    ['article:has([data-kind="item]) span', 'data-kind', 'item]) span', true],
  ])(
    'recovers attribute selector %j at EOF',
    (selector, attribute, value, nested) => {
      const root = document.createElement('section');
      const wrapper = document.createElement('article');
      const child = document.createElement('div');
      child.setAttribute(attribute as string, value);
      wrapper.appendChild(child);
      root.appendChild(wrapper);
      const expected = nested ? wrapper : child;

      expect(() => parseSelector(selector as string)).not.toThrow();
      expect(root.querySelector(selector as string)).toBe(expected);
      expect(root.querySelectorAll(selector as string)).toEqual([expected]);
    },
  );

  it('recovers an EOF attribute after a complete compound member', () => {
    const root = document.createElement('section');
    const child = document.createElement('div');
    child.setAttribute('data-kind', 'a');
    child.setAttribute('other', 'b');
    root.appendChild(child);
    const selector = '[data-kind="a"][other="b';

    expect(() => parseSelector(selector)).not.toThrow();
    expect(root.querySelector(selector)).toBe(child);
    expect(root.querySelectorAll(selector)).toEqual([child]);
  });

  it.each([
    '',
    '   ',
    'div)',
    'div, span',
    ':hover',
    ':HOVER',
    ':matches(div)',
    ':has(:hover)',
    'div >',
    'div >> span',
    'div:has()',
    'div:has(span))',
    '[data-kind^=item]',
    '[data-kind=item"value]',
    '[data-kind==item]',
    '[data-kind="item" junk]',
    '[data-kind=#item]',
    '[data-kind]div',
    ':not(.missing)div',
  ])('reports malformed or unsupported %j as SyntaxError', (selector) => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));

    expectDOMError(() => parseSelector(selector), 'SyntaxError');
    expectDOMError(() => parent.querySelector(selector), 'SyntaxError');
    expectDOMError(() => parent.querySelectorAll(selector), 'SyntaxError');
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

  it('preserves public error names without the DOMException global', () => {
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
      const parent = document.createElement('div');
      const foreignChild = document.createElement('span');
      const firstElement = document.createElement('section');
      const secondElement = document.createElement('section');
      firstElement.setAttribute('shared', 'value');
      const sharedAttribute = firstElement.attributes.item(0)!;
      class InvalidElement extends HTMLElement {}

      const operations: [() => unknown, string][] = [
        [() => parent.append(parent), 'HierarchyRequestError'],
        [() => parent.removeChild(foreignChild), 'NotFoundError'],
        [() => parent.querySelector(''), 'SyntaxError'],
        [() => document.createElement('invalid name'), 'InvalidCharacterError'],
        [() => document.createElementNS(null, 'p:name'), 'NamespaceError'],
        [() => customElements.define('invalid', InvalidElement), 'SyntaxError'],
        [() => document.importNode(document), 'NotSupportedError'],
        [
          () => secondElement.attributes.setNamedItem(sharedAttribute),
          'InUseAttributeError',
        ],
      ];

      for (const [operation, name] of operations) {
        expectDOMError(operation, name);
      }
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

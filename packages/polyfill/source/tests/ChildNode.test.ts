import {Window} from '../index.ts';

import {describe, it, expect, beforeEach} from 'vitest';

function siblingChain(parent: ParentNode) {
  const names: string[] = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    names.push(node.nodeName.toLowerCase());
  }
  return names;
}

describe('ChildNode', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  describe('replaceWith', () => {
    let first: Element;
    let target: Element;
    let last: Element;

    beforeEach(() => {
      first = document.createElement('first-child');
      target = document.createElement('target-child');
      last = document.createElement('last-child');
      document.body.append(first, target, last);
    });

    it('replaces a middle child with a single node', () => {
      const replacement = document.createElement('replacement-child');

      target.replaceWith(replacement);

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'replacement-child',
        'last-child',
      ]);
      expect(replacement.parentNode).toBe(document.body);
      expect(target.parentNode).toBeNull();
      expect(document.querySelector('replacement-child')).toBe(replacement);
    });

    it('replaces the last child', () => {
      const replacement = document.createElement('replacement-child');

      last.replaceWith(replacement);

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'target-child',
        'replacement-child',
      ]);
      expect(document.body.lastChild).toBe(replacement);
    });

    it('replaces the first child', () => {
      const replacement = document.createElement('replacement-child');

      first.replaceWith(replacement);

      expect(siblingChain(document.body)).toStrictEqual([
        'replacement-child',
        'target-child',
        'last-child',
      ]);
      expect(document.body.firstChild).toBe(replacement);
    });

    it('inserts multiple nodes in argument order', () => {
      target.replaceWith(
        document.createElement('replacement-one'),
        document.createElement('replacement-two'),
      );

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'replacement-one',
        'replacement-two',
        'last-child',
      ]);
    });

    it('inserts strings as text nodes', () => {
      target.replaceWith('replacement text');

      expect(document.body.childNodes[1]!.nodeType).toBe(3);
      expect(document.body.childNodes[1]!.textContent).toBe('replacement text');
      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        '#text',
        'last-child',
      ]);
    });

    it('mixes nodes and strings', () => {
      target.replaceWith(
        'before ',
        document.createElement('mixed-child'),
        ' after',
      );

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        '#text',
        'mixed-child',
        '#text',
        'last-child',
      ]);
    });

    it('removes the node when called with no arguments', () => {
      target.replaceWith();

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'last-child',
      ]);
      expect(target.parentNode).toBeNull();
    });

    it('does nothing to a node without a parent', () => {
      const detached = document.createElement('detached-child');

      expect(() =>
        detached.replaceWith(document.createElement('replacement-child')),
      ).not.toThrow();
      expect(detached.parentNode).toBeNull();
    });

    it('moves a node that is already in the document', () => {
      target.replaceWith(first);

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'last-child',
      ]);
      expect(first.parentNode).toBe(document.body);
      expect(target.parentNode).toBeNull();
    });

    it('replaces a node with its own next sibling', () => {
      target.replaceWith(last);

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'last-child',
      ]);
      expect(target.parentNode).toBeNull();
    });

    it('replaces a node with itself', () => {
      target.replaceWith(target);

      expect(siblingChain(document.body)).toStrictEqual([
        'first-child',
        'target-child',
        'last-child',
      ]);
      expect(target.parentNode).toBe(document.body);
    });

    it('keeps the sibling chain and childNodes in agreement', () => {
      target.replaceWith(
        document.createElement('replacement-one'),
        document.createElement('replacement-two'),
      );

      expect(siblingChain(document.body)).toStrictEqual(
        Array.from(document.body.childNodes, (node) =>
          node.nodeName.toLowerCase(),
        ),
      );
    });
  });
});

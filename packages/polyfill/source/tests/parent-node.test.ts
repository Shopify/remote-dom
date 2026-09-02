import {Window} from '../index.ts';

import {beforeEach, describe, expect, it} from 'vitest';

function siblingChain(parent: ParentNode) {
  const names: string[] = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    names.push(node.nodeName.toLowerCase());
  }
  return names;
}

function childNodeNames(parent: ParentNode) {
  return Array.from(parent.childNodes, (node) => node.nodeName.toLowerCase());
}

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('ParentNode.appendChild', () => {
  it('returns the appended child', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');

    expect(parent.appendChild(child)).toBe(child);
  });
});

describe('ParentNode.insertBefore', () => {
  it('links an element inserted before a middle child into tree order', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const middle = document.createElement('em');
    const last = document.createElement('strong');

    parent.appendChild(first);
    parent.appendChild(last);

    expect(parent.insertBefore(middle, last)).toBe(middle);
    expect(Array.from(parent.childNodes)).toEqual([first, middle, last]);
    expect(first.nextSibling).toBe(middle);
    expect(middle.previousSibling).toBe(first);
    expect(middle.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(middle);
  });

  it('inserts before the first child', () => {
    const existing = document.createElement('existing-child');
    document.body.appendChild(existing);

    const inserted = document.createElement('inserted-child');
    document.body.insertBefore(inserted, existing);

    expect(siblingChain(document.body)).toStrictEqual([
      'inserted-child',
      'existing-child',
    ]);
    expect(document.body.firstChild).toBe(inserted);
  });

  it('keeps the sibling chain and childNodes in agreement', () => {
    const anchor = document.createElement('anchor-child');
    document.body.appendChild(anchor);

    for (let i = 0; i < 3; i++) {
      document.body.insertBefore(document.createElement(`child-${i}`), anchor);
    }

    expect(siblingChain(document.body)).toStrictEqual(
      childNodeNames(document.body),
    );
    expect(siblingChain(document.body)).toStrictEqual([
      'child-0',
      'child-1',
      'child-2',
      'anchor-child',
    ]);
  });

  it('finds a node inserted before a non-first child by selector', () => {
    const style = document.createElement('style');
    document.body.appendChild(style);

    const modal = document.createElement('s-modal');
    modal.setAttribute('id', 'add-zone');
    document.body.insertBefore(modal, style);

    expect(document.querySelector('s-modal#add-zone')).toBe(modal);
    expect(document.querySelectorAll('s-modal')).toHaveLength(1);
  });

  it('inserts the children of a document fragment in order', () => {
    const anchor = document.createElement('anchor-child');
    document.body.appendChild(anchor);

    const fragment = document.createDocumentFragment();
    fragment.append(
      document.createElement('fragment-first'),
      document.createElement('fragment-last'),
    );
    document.body.insertBefore(fragment, anchor);

    expect(siblingChain(document.body)).toStrictEqual([
      'fragment-first',
      'fragment-last',
      'anchor-child',
    ]);
    expect(siblingChain(document.body)).toStrictEqual(
      childNodeNames(document.body),
    );
  });

  it('relinks a node moved from later to earlier in the same parent', () => {
    const first = document.createElement('first-child');
    const middle = document.createElement('middle-child');
    const last = document.createElement('last-child');
    document.body.append(first, middle, last);

    document.body.insertBefore(last, middle);

    expect(siblingChain(document.body)).toStrictEqual([
      'first-child',
      'last-child',
      'middle-child',
    ]);
    expect(siblingChain(document.body)).toStrictEqual(
      childNodeNames(document.body),
    );
  });
});

describe('ParentNode.replaceChild', () => {
  it('keeps the chain walkable after replacing a middle child', () => {
    const first = document.createElement('first-child');
    const placeholder = document.createElement('placeholder-child');
    const last = document.createElement('last-child');
    document.body.append(first, placeholder, last);

    const replacement = document.createElement('replacement-child');
    document.body.replaceChild(replacement, placeholder);

    expect(siblingChain(document.body)).toStrictEqual([
      'first-child',
      'replacement-child',
      'last-child',
    ]);
    expect(document.querySelector('replacement-child')).toBe(replacement);
    expect(document.querySelector('placeholder-child')).toBeNull();
  });
});

describe('ParentNode.prepend', () => {
  it('prepends multiple nodes ahead of an existing child', () => {
    const existing = document.createElement('existing-child');
    document.body.appendChild(existing);

    document.body.prepend(
      document.createElement('prepended-first'),
      document.createElement('prepended-last'),
    );

    expect(siblingChain(document.body)).toStrictEqual([
      'prepended-first',
      'prepended-last',
      'existing-child',
    ]);
    expect(siblingChain(document.body)).toStrictEqual(
      childNodeNames(document.body),
    );
  });
});

describe('ChildNode.after', () => {
  it('inserts after a non-last child', () => {
    const first = document.createElement('first-child');
    const last = document.createElement('last-child');
    document.body.append(first, last);

    first.after(document.createElement('inserted-child'));

    expect(siblingChain(document.body)).toStrictEqual([
      'first-child',
      'inserted-child',
      'last-child',
    ]);
  });
});

import {Window} from '../index.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('ParentNode mutation return values', () => {
  it('returns the removed child and preserves the remaining tree structure', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    parent.append(first, child, last);

    expect(parent.removeChild(child)).toBe(child);

    expect(Array.from(parent.childNodes)).toEqual([first, last]);
    expect(first.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(first);
    expect(child.parentNode).toBeNull();
    expect(child.previousSibling).toBeNull();
    expect(child.nextSibling).toBeNull();
  });

  it('returns the replaced child and installs the replacement in its place', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const oldChild = document.createElement('em');
    const last = document.createElement('strong');
    const newChild = document.createElement('i');
    parent.append(first, oldChild, last);

    expect(parent.replaceChild(newChild, oldChild)).toBe(oldChild);

    expect(Array.from(parent.childNodes)).toEqual([first, newChild, last]);
    expect(first.nextSibling).toBe(newChild);
    expect(newChild.previousSibling).toBe(first);
    expect(newChild.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(newChild);
    expect(newChild.parentNode).toBe(parent);
    expect(oldChild.parentNode).toBeNull();
  });

  it('returns the child when replacing it with itself without changing the tree', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    parent.append(first, child, last);

    expect(parent.replaceChild(child, child)).toBe(child);

    expect(Array.from(parent.childNodes)).toEqual([first, child, last]);
    expect(first.nextSibling).toBe(child);
    expect(child.previousSibling).toBe(first);
    expect(child.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(child);
    expect(child.parentNode).toBe(parent);
  });
});

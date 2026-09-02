import {Window} from '../index.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('Node.contains', () => {
  it('returns true for itself', () => {
    const element = document.createElement('div');

    expect(element.contains(element)).toBe(true);
  });

  it('returns true for a direct child', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    expect(parent.contains(child)).toBe(true);
  });

  it('returns true for a deep descendant', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const grandchild = document.createElement('em');
    parent.appendChild(child);
    child.appendChild(grandchild);

    expect(parent.contains(grandchild)).toBe(true);
  });

  it('returns false for a node in another subtree', () => {
    const parent = document.createElement('div');
    const otherParent = document.createElement('div');
    const otherChild = document.createElement('span');
    otherParent.appendChild(otherChild);

    expect(parent.contains(otherChild)).toBe(false);
  });

  it('returns false for null', () => {
    const parent = document.createElement('div');

    expect(parent.contains(null)).toBe(false);
  });
});

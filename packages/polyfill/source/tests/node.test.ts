import {Window} from '../index.ts';

import {describe, it, expect, beforeEach} from 'vitest';

describe('Node#contains', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  it('returns true for a direct child', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.append(child);

    expect(parent.contains(child)).toBe(true);
  });

  it('returns true for an indirect descendant', () => {
    const ancestor = document.createElement('div');
    const middle = document.createElement('div');
    const descendant = document.createElement('span');
    middle.append(descendant);
    ancestor.append(middle);

    // The walk used to re-read the original node's parentNode instead of
    // advancing, so any indirect descendant looped forever.
    expect(ancestor.contains(descendant)).toBe(true);
  });

  it('returns true for the node itself', () => {
    const element = document.createElement('div');

    expect(element.contains(element)).toBe(true);
  });

  it('returns false for a detached node', () => {
    const element = document.createElement('div');
    const detached = document.createElement('span');

    expect(element.contains(detached)).toBe(false);
  });

  it('returns false for sibling subtrees', () => {
    const root = document.createElement('div');
    const left = document.createElement('div');
    const right = document.createElement('div');
    const rightChild = document.createElement('span');
    right.append(rightChild);
    root.append(left, right);

    expect(left.contains(rightChild)).toBe(false);
  });

  it('returns false for null', () => {
    const element = document.createElement('div');

    expect(element.contains(null)).toBe(false);
  });
});

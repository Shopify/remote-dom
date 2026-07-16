import {Window} from '../index.ts';

import {beforeEach, describe, expect, it} from 'vitest';

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
    parent.insertBefore(middle, last);

    expect(Array.from(parent.childNodes)).toEqual([first, middle, last]);
    expect(first.nextSibling).toBe(middle);
    expect(middle.previousSibling).toBe(first);
    expect(middle.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(middle);
  });
});

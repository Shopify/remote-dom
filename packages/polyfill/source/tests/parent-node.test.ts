import {Window} from '../index.ts';

import {describe, it, expect, beforeEach} from 'vitest';

describe('ParentNode', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  it('updates sibling links when inserting before a non-head child', () => {
    const parent = document.createElement('div');
    const first = document.createElement('first');
    const second = document.createElement('second');
    const third = document.createElement('third');
    const inserted = document.createElement('inserted');

    parent.append(first, second, third);
    parent.insertBefore(inserted, second);

    expect([...parent.childNodes]).toStrictEqual([
      first,
      inserted,
      second,
      third,
    ]);
    expect(nodesFromSiblingLinks(parent)).toStrictEqual([...parent.childNodes]);
    expect(first.nextSibling).toBe(inserted);
    expect(inserted.previousSibling).toBe(first);
    expect(inserted.nextSibling).toBe(second);
    expect(second.previousSibling).toBe(inserted);
  });

  it('updates sibling links when moving a child before a non-head child', () => {
    const parent = document.createElement('div');
    const first = document.createElement('first');
    const second = document.createElement('second');
    const third = document.createElement('third');
    const moved = document.createElement('moved');

    parent.append(first, second, third, moved);
    parent.insertBefore(moved, second);

    expect([...parent.childNodes]).toStrictEqual([first, moved, second, third]);
    expect(nodesFromSiblingLinks(parent)).toStrictEqual([...parent.childNodes]);
    expect(first.nextSibling).toBe(moved);
    expect(moved.previousSibling).toBe(first);
    expect(moved.nextSibling).toBe(second);
    expect(second.previousSibling).toBe(moved);
  });
});

function nodesFromSiblingLinks(parent: Node) {
  const nodes: Node[] = [];
  let node = parent.firstChild;

  while (node) {
    nodes.push(node);
    node = node.nextSibling;
  }

  return nodes;
}

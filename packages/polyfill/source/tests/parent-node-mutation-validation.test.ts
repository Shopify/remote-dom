import {HOOKS, Window} from '../index.ts';

import {beforeEach, describe, expect, it, vi} from 'vitest';

let polyfillWindow: Window;

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
});

describe('ParentNode insertion validation', () => {
  it('rejects inserting a node into itself without changing the tree', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    expect(() => parent.appendChild(parent)).toThrow();

    expect(parent.parentNode).toBeNull();
    expect(Array.from(parent.childNodes)).toEqual([child]);
    expect(child.parentNode).toBe(parent);
  });

  it('rejects inserting an ancestor without changing either tree', () => {
    const ancestor = document.createElement('section');
    const parent = document.createElement('div');
    const child = document.createElement('span');
    ancestor.appendChild(parent);
    parent.appendChild(child);

    expect(() => parent.insertBefore(ancestor, child)).toThrow();

    expect(ancestor.parentNode).toBeNull();
    expect(Array.from(ancestor.childNodes)).toEqual([parent]);
    expect(parent.parentNode).toBe(ancestor);
    expect(Array.from(parent.childNodes)).toEqual([child]);
    expect(child.parentNode).toBe(parent);
  });

  it('preserves an attached child when the reference belongs to another parent', () => {
    const source = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    const destination = document.createElement('div');
    const foreignParent = document.createElement('div');
    const foreignReference = document.createElement('span');
    source.append(first, child, last);
    foreignParent.appendChild(foreignReference);

    expect(() => destination.insertBefore(child, foreignReference)).toThrow();

    expect(Array.from(source.childNodes)).toEqual([first, child, last]);
    expect(first.nextSibling).toBe(child);
    expect(child.previousSibling).toBe(first);
    expect(child.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(child);
    expect(child.parentNode).toBe(source);
    expect(Array.from(destination.childNodes)).toEqual([]);
    expect(Array.from(foreignParent.childNodes)).toEqual([foreignReference]);
  });

  it('does nothing when inserting a node before itself', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    parent.append(first, child, last);

    expect(parent.insertBefore(child, child)).toBe(child);

    expect(Array.from(parent.childNodes)).toEqual([first, child, last]);
    expect(first.nextSibling).toBe(child);
    expect(child.previousSibling).toBe(first);
    expect(child.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(child);
    expect(child.parentNode).toBe(parent);
  });

  it('preserves valid move semantics for an attached node', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    parent.append(first, child, last);

    parent.insertBefore(child, first);

    expect(Array.from(parent.childNodes)).toEqual([child, first, last]);
    expect(child.previousSibling).toBeNull();
    expect(child.nextSibling).toBe(first);
    expect(first.previousSibling).toBe(child);
    expect(first.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(first);
  });

  it('does not move fragment children when the reference is invalid', () => {
    const parent = document.createElement('div');
    const existing = document.createElement('span');
    const fragment = document.createDocumentFragment();
    const first = document.createElement('em');
    const last = document.createElement('strong');
    const foreignReference = document.createElement('span');
    parent.appendChild(existing);
    fragment.append(first, last);

    expect(() => parent.insertBefore(fragment, foreignReference)).toThrow();

    expect(Array.from(parent.childNodes)).toEqual([existing]);
    expect(Array.from(fragment.childNodes)).toEqual([first, last]);
    expect(first.parentNode).toBe(fragment);
    expect(first.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(first);
    expect(last.parentNode).toBe(fragment);
  });

  it('rejects inserting a fragment into its descendant without moving children', () => {
    const fragment = document.createDocumentFragment();
    const ancestor = document.createElement('section');
    const parent = document.createElement('div');
    fragment.appendChild(ancestor);
    ancestor.appendChild(parent);

    expect(() => parent.appendChild(fragment)).toThrow();

    expect(Array.from(fragment.childNodes)).toEqual([ancestor]);
    expect(ancestor.parentNode).toBe(fragment);
    expect(Array.from(ancestor.childNodes)).toEqual([parent]);
    expect(parent.parentNode).toBe(ancestor);
    expect(Array.from(parent.childNodes)).toEqual([]);
  });

  it('rejects inserting a template into its own content without changing state', () => {
    const parent = document.createElement('div');
    const template = document.createElement('template');
    const content = template.content;
    parent.appendChild(template);
    const removeChild = vi.fn();
    polyfillWindow[HOOKS].removeChild = removeChild;

    expect(() => content.appendChild(template)).toThrow();

    expect(Array.from(parent.childNodes)).toEqual([template]);
    expect(template.parentNode).toBe(parent);
    expect(Array.from(content.childNodes)).toEqual([]);
    expect(content.parentNode).toBeNull();
    expect(template.contains(content)).toBe(false);
    expect(removeChild).not.toHaveBeenCalled();
  });

  it('rejects mutually nesting templates through their content fragments', () => {
    const parent = document.createElement('div');
    const outer = document.createElement('template');
    const inner = document.createElement('template');
    parent.appendChild(outer);
    outer.content.appendChild(inner);
    const removeChild = vi.fn();
    polyfillWindow[HOOKS].removeChild = removeChild;

    expect(() => inner.content.appendChild(outer)).toThrow();

    expect(Array.from(parent.childNodes)).toEqual([outer]);
    expect(outer.parentNode).toBe(parent);
    expect(Array.from(outer.content.childNodes)).toEqual([inner]);
    expect(inner.parentNode).toBe(outer.content);
    expect(Array.from(inner.content.childNodes)).toEqual([]);
    expect(removeChild).not.toHaveBeenCalled();
  });

  it('rejects nesting an ancestor template through nested template content', () => {
    const parent = document.createElement('div');
    const outer = document.createElement('template');
    const wrapper = document.createElement('section');
    const inner = document.createElement('template');
    parent.appendChild(outer);
    outer.content.appendChild(wrapper);
    wrapper.appendChild(inner);
    const removeChild = vi.fn();
    polyfillWindow[HOOKS].removeChild = removeChild;

    expect(() => inner.content.appendChild(outer)).toThrow();

    expect(Array.from(parent.childNodes)).toEqual([outer]);
    expect(outer.parentNode).toBe(parent);
    expect(Array.from(outer.content.childNodes)).toEqual([wrapper]);
    expect(wrapper.parentNode).toBe(outer.content);
    expect(Array.from(wrapper.childNodes)).toEqual([inner]);
    expect(inner.parentNode).toBe(wrapper);
    expect(Array.from(inner.content.childNodes)).toEqual([]);
    expect(removeChild).not.toHaveBeenCalled();
  });
});

describe('ParentNode replacement validation', () => {
  it('replaces a child with its next sibling without detaching the sibling', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const oldChild = document.createElement('em');
    const nextSibling = document.createElement('strong');
    const last = document.createElement('span');
    parent.append(first, oldChild, nextSibling, last);

    parent.replaceChild(nextSibling, oldChild);

    expect(Array.from(parent.childNodes)).toEqual([first, nextSibling, last]);
    expect(first.nextSibling).toBe(nextSibling);
    expect(nextSibling.previousSibling).toBe(first);
    expect(nextSibling.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(nextSibling);
    expect(nextSibling.parentNode).toBe(parent);
    expect(oldChild.parentNode).toBeNull();
    expect(oldChild.previousSibling).toBeNull();
    expect(oldChild.nextSibling).toBeNull();
  });

  it('rejects replacing a child with the parent without removing the child', () => {
    const parent = document.createElement('div');
    const oldChild = document.createElement('span');
    parent.appendChild(oldChild);

    expect(() => parent.replaceChild(parent, oldChild)).toThrow();

    expect(parent.parentNode).toBeNull();
    expect(Array.from(parent.childNodes)).toEqual([oldChild]);
    expect(oldChild.parentNode).toBe(parent);
  });

  it('rejects replacing a child with an ancestor without changing either tree', () => {
    const ancestor = document.createElement('section');
    const parent = document.createElement('div');
    const oldChild = document.createElement('span');
    ancestor.appendChild(parent);
    parent.appendChild(oldChild);

    expect(() => parent.replaceChild(ancestor, oldChild)).toThrow();

    expect(ancestor.parentNode).toBeNull();
    expect(Array.from(ancestor.childNodes)).toEqual([parent]);
    expect(parent.parentNode).toBe(ancestor);
    expect(Array.from(parent.childNodes)).toEqual([oldChild]);
    expect(oldChild.parentNode).toBe(parent);
  });

  it('preserves the replacement node when the old child belongs elsewhere', () => {
    const source = document.createElement('div');
    const first = document.createElement('span');
    const replacement = document.createElement('em');
    const last = document.createElement('strong');
    const parent = document.createElement('div');
    const existing = document.createElement('span');
    const foreignParent = document.createElement('div');
    const foreignOldChild = document.createElement('span');
    source.append(first, replacement, last);
    parent.appendChild(existing);
    foreignParent.appendChild(foreignOldChild);

    expect(() => parent.replaceChild(replacement, foreignOldChild)).toThrow();

    expect(Array.from(source.childNodes)).toEqual([first, replacement, last]);
    expect(first.nextSibling).toBe(replacement);
    expect(replacement.previousSibling).toBe(first);
    expect(replacement.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(replacement);
    expect(replacement.parentNode).toBe(source);
    expect(Array.from(parent.childNodes)).toEqual([existing]);
    expect(Array.from(foreignParent.childNodes)).toEqual([foreignOldChild]);
  });

  it('does nothing when replacing a child with itself', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const child = document.createElement('em');
    const last = document.createElement('strong');
    parent.append(first, child, last);

    parent.replaceChild(child, child);

    expect(Array.from(parent.childNodes)).toEqual([first, child, last]);
    expect(first.nextSibling).toBe(child);
    expect(child.previousSibling).toBe(first);
    expect(child.nextSibling).toBe(last);
    expect(last.previousSibling).toBe(child);
    expect(child.parentNode).toBe(parent);
  });
});

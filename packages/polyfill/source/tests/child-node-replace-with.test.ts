import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

let polyfillWindow: Window;

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
});

describe('ChildNode.replaceWith', () => {
  it('inserts multiple nodes and strings in argument order', () => {
    const parent = document.createElement('div');
    const receiver = document.createElement('span');
    const existingNext = document.createElement('em');
    const trailing = document.createElement('strong');
    const first = document.createElement('i');
    const last = document.createElement('b');
    parent.append(receiver, existingNext, trailing);

    receiver.replaceWith(first, existingNext, 'middle', last);

    const children = [...parent.childNodes];
    expect(children).toEqual([
      first,
      existingNext,
      expect.objectContaining({data: 'middle'}),
      last,
      trailing,
    ]);
    expect(children[1]!.nextSibling).toBe(children[2]);
    expect(children[2]!.nextSibling).toBe(last);
    expect(receiver.parentNode).toBeNull();
  });

  it('preserves argument order when the receiver is a replacement', () => {
    const parent = document.createElement('div');
    const receiver = document.createElement('span');
    const replacement = document.createElement('em');
    const after = document.createElement('strong');
    parent.append(receiver, after);

    receiver.replaceWith(replacement, receiver);

    expect([...parent.childNodes]).toEqual([replacement, receiver, after]);
    expect(replacement.nextSibling).toBe(receiver);
    expect(receiver.previousSibling).toBe(replacement);
    expect(receiver.nextSibling).toBe(after);
  });

  it('rejects a cyclic first argument without mutating the tree', () => {
    let reactions = 0;

    class CyclicReceiver extends PolyfillHTMLElement {
      disconnectedCallback() {
        reactions += 1;
      }
    }

    polyfillWindow.customElements.define(
      'cyclic-receiver',
      CyclicReceiver as unknown as CustomElementConstructor,
    );
    const parent = document.createElement('div');
    const before = document.createElement('span');
    const receiver = document.createElement('cyclic-receiver');
    const after = document.createElement('strong');
    parent.append(before, receiver, after);
    document.body.appendChild(parent);
    const mutations: string[] = [];
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');

    expect(() => receiver.replaceWith(parent)).toThrow();

    expect([...document.body.childNodes]).toEqual([parent]);
    expect([...parent.childNodes]).toEqual([before, receiver, after]);
    expect(before.nextSibling).toBe(receiver);
    expect(receiver.previousSibling).toBe(before);
    expect(receiver.nextSibling).toBe(after);
    expect(after.previousSibling).toBe(receiver);
    expect(mutations).toEqual([]);
    expect(reactions).toBe(0);
  });

  it('rejects a cyclic later argument before mutating connected trees', () => {
    let callbacks = 0;

    class ConnectedReplacement extends PolyfillHTMLElement {
      connectedCallback() {
        callbacks += 1;
      }

      disconnectedCallback() {
        callbacks += 1;
      }
    }

    polyfillWindow.customElements.define(
      'connected-replacement',
      ConnectedReplacement as unknown as CustomElementConstructor,
    );
    const parent = document.createElement('div');
    const before = document.createElement('span');
    const receiver = document.createElement('em');
    const after = document.createElement('strong');
    parent.append(before, receiver, after);
    const source = document.createElement('div');
    const replacement = document.createElement('connected-replacement');
    const sourceSibling = document.createElement('i');
    source.append(replacement, sourceSibling);
    document.body.append(parent, source);
    callbacks = 0;
    const mutations: string[] = [];
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');

    expect(() => receiver.replaceWith(replacement, parent)).toThrow();

    expect(parent.parentNode).toBe(document.body);
    expect([...document.body.childNodes]).toEqual([parent, source]);
    expect([...parent.childNodes]).toEqual([before, receiver, after]);
    expect(before.nextSibling).toBe(receiver);
    expect(receiver.previousSibling).toBe(before);
    expect(receiver.nextSibling).toBe(after);
    expect(after.previousSibling).toBe(receiver);
    expect([...source.childNodes]).toEqual([replacement, sourceSibling]);
    expect(replacement.parentNode).toBe(source);
    expect(replacement.isConnected).toBe(true);
    expect(mutations).toEqual([]);
    expect(callbacks).toBe(0);
  });

  it('commits every replacement before running reentrant reactions', () => {
    let parent: HTMLElement;
    let first: HTMLElement;
    let second: HTMLElement;
    let observedChildren: unknown[] = [];

    class ReentrantReceiver extends PolyfillHTMLElement {
      disconnectedCallback() {
        observedChildren = [...parent.childNodes];
        second.remove();
      }
    }

    polyfillWindow.customElements.define(
      'reentrant-receiver',
      ReentrantReceiver as unknown as CustomElementConstructor,
    );
    parent = document.createElement('div');
    const receiver = document.createElement('reentrant-receiver');
    first = document.createElement('span');
    second = document.createElement('strong');
    parent.appendChild(receiver);
    document.body.appendChild(parent);

    receiver.replaceWith(first, second);

    expect(observedChildren).toEqual([first, second]);
    expect([...parent.childNodes]).toEqual([first]);
    expect(receiver.parentNode).toBeNull();
    expect(second.parentNode).toBeNull();
  });
});

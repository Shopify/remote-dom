import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

let polyfillWindow: Window;

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
});

describe('ChildNode.before', () => {
  it('preserves adjacent siblings and the receiver in argument order', () => {
    const parent = document.createElement('div');
    const leading = document.createElement('span');
    const previous = document.createElement('em');
    const receiver = document.createElement('strong');
    const replacement = document.createElement('i');
    const after = document.createElement('b');
    parent.append(leading, previous, receiver, after);

    receiver.before(previous, replacement, receiver);

    expect([...parent.childNodes]).toEqual([
      leading,
      previous,
      replacement,
      receiver,
      after,
    ]);
    expect(leading.nextSibling).toBe(previous);
    expect(previous.nextSibling).toBe(replacement);
    expect(replacement.nextSibling).toBe(receiver);
    expect(receiver.nextSibling).toBe(after);
  });

  it('commits every argument before running connected callbacks', () => {
    let parent: HTMLElement;
    let observedChildren: unknown[] = [];

    class BeforeObserver extends PolyfillHTMLElement {
      connectedCallback() {
        observedChildren = [...parent.childNodes];
      }
    }

    polyfillWindow.customElements.define(
      'before-observer',
      BeforeObserver as unknown as CustomElementConstructor,
    );
    parent = document.createElement('div');
    const receiver = document.createElement('em');
    const after = document.createElement('strong');
    parent.append(receiver, after);
    document.body.appendChild(parent);
    const first = document.createElement('before-observer');
    const second = document.createElement('span');

    receiver.before(first, second);

    expect(observedChildren).toEqual([first, second, receiver, after]);
    expect([...parent.childNodes]).toEqual([first, second, receiver, after]);
  });

  it('does not move earlier arguments when a later conversion throws', () => {
    let callbacks = 0;

    class BeforeReplacement extends PolyfillHTMLElement {
      connectedCallback() {
        callbacks += 1;
      }

      disconnectedCallback() {
        callbacks += 1;
      }
    }

    polyfillWindow.customElements.define(
      'before-replacement',
      BeforeReplacement as unknown as CustomElementConstructor,
    );
    const parent = document.createElement('div');
    const receiver = document.createElement('em');
    parent.appendChild(receiver);
    const source = document.createElement('div');
    const replacement = document.createElement('before-replacement');
    source.appendChild(replacement);
    document.body.append(parent, source);
    callbacks = 0;
    const mutations: string[] = [];
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');
    const error = new Error('conversion failed');
    const throwingValue = {
      toString() {
        throw error;
      },
    } as unknown as string;

    expect(() => receiver.before(replacement, throwingValue)).toThrow(error);

    expect([...document.body.childNodes]).toEqual([parent, source]);
    expect([...parent.childNodes]).toEqual([receiver]);
    expect([...source.childNodes]).toEqual([replacement]);
    expect(replacement.parentNode).toBe(source);
    expect(replacement.isConnected).toBe(true);
    expect(mutations).toEqual([]);
    expect(callbacks).toBe(0);
  });

  it('commits every argument before rethrowing a lifecycle error', () => {
    const error = new Error('connected callback failed');
    let secondCallbackRan = false;

    class ThrowingBeforeElement extends PolyfillHTMLElement {
      connectedCallback() {
        throw error;
      }
    }

    class SecondBeforeElement extends PolyfillHTMLElement {
      connectedCallback() {
        secondCallbackRan = true;
      }
    }

    polyfillWindow.customElements.define(
      'throwing-before',
      ThrowingBeforeElement as unknown as CustomElementConstructor,
    );
    polyfillWindow.customElements.define(
      'second-before',
      SecondBeforeElement as unknown as CustomElementConstructor,
    );
    const parent = document.createElement('div');
    const receiver = document.createElement('em');
    parent.appendChild(receiver);
    document.body.appendChild(parent);
    const first = document.createElement('throwing-before');
    const second = document.createElement('second-before');

    expect(() => receiver.before(first, second)).toThrow(error);

    expect([...parent.childNodes]).toEqual([first, second, receiver]);
    expect(secondCallbackRan).toBe(true);
  });
});

describe('ChildNode.after', () => {
  it('preserves the receiver and adjacent siblings in argument order', () => {
    const parent = document.createElement('div');
    const before = document.createElement('span');
    const receiver = document.createElement('em');
    const next = document.createElement('strong');
    const replacement = document.createElement('i');
    const trailing = document.createElement('b');
    parent.append(before, receiver, next, trailing);

    receiver.after(receiver, replacement, next);

    expect([...parent.childNodes]).toEqual([
      before,
      receiver,
      replacement,
      next,
      trailing,
    ]);
    expect(before.nextSibling).toBe(receiver);
    expect(receiver.nextSibling).toBe(replacement);
    expect(replacement.nextSibling).toBe(next);
    expect(next.nextSibling).toBe(trailing);
  });

  it('commits every argument before running connected callbacks', () => {
    let parent: HTMLElement;
    let observedChildren: unknown[] = [];

    class AfterObserver extends PolyfillHTMLElement {
      connectedCallback() {
        observedChildren = [...parent.childNodes];
      }
    }

    polyfillWindow.customElements.define(
      'after-observer',
      AfterObserver as unknown as CustomElementConstructor,
    );
    parent = document.createElement('div');
    const before = document.createElement('span');
    const receiver = document.createElement('em');
    const after = document.createElement('strong');
    parent.append(before, receiver, after);
    document.body.appendChild(parent);
    const first = document.createElement('after-observer');
    const second = document.createElement('i');

    receiver.after(first, second);

    expect(observedChildren).toEqual([before, receiver, first, second, after]);
    expect([...parent.childNodes]).toEqual([
      before,
      receiver,
      first,
      second,
      after,
    ]);
  });

  it('rejects a cyclic later argument before mutating connected trees', () => {
    let callbacks = 0;

    class AfterReplacement extends PolyfillHTMLElement {
      connectedCallback() {
        callbacks += 1;
      }

      disconnectedCallback() {
        callbacks += 1;
      }
    }

    polyfillWindow.customElements.define(
      'after-replacement',
      AfterReplacement as unknown as CustomElementConstructor,
    );
    const parent = document.createElement('div');
    const receiver = document.createElement('em');
    const trailing = document.createElement('strong');
    parent.append(receiver, trailing);
    const source = document.createElement('div');
    const replacement = document.createElement('after-replacement');
    source.appendChild(replacement);
    document.body.append(parent, source);
    callbacks = 0;
    const mutations: string[] = [];
    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');

    expect(() => receiver.after(replacement, parent)).toThrow();

    expect([...document.body.childNodes]).toEqual([parent, source]);
    expect([...parent.childNodes]).toEqual([receiver, trailing]);
    expect([...source.childNodes]).toEqual([replacement]);
    expect(replacement.parentNode).toBe(source);
    expect(replacement.isConnected).toBe(true);
    expect(mutations).toEqual([]);
    expect(callbacks).toBe(0);
  });
});

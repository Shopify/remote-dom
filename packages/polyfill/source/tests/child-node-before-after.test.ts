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

  it('commits arguments before disconnecting a moved custom element', () => {
    const parent = document.createElement('div');
    const receiver = document.createElement('em');
    const trailing = document.createElement('strong');
    const second = document.createElement('span');
    const reactions: string[] = [];
    let observedChildren: unknown[] = [];

    class MovingBeforeElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('connected');
      }

      disconnectedCallback() {
        reactions.push('disconnected');
        observedChildren = [...parent.childNodes];
      }
    }

    polyfillWindow.customElements.define(
      'moving-before-element',
      MovingBeforeElement as unknown as CustomElementConstructor,
    );

    const first = document.createElement('moving-before-element');
    parent.append(receiver, trailing);
    document.body.append(parent, first);
    reactions.length = 0;

    receiver.before(first, second);

    expect([...parent.childNodes]).toEqual([first, second, receiver, trailing]);
    expect(observedChildren).toEqual([first, second, receiver, trailing]);
    expect(reactions).toEqual(['disconnected', 'connected']);
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

  it('commits arguments before disconnecting a moved custom element', () => {
    const parent = document.createElement('div');
    const receiver = document.createElement('em');
    const trailing = document.createElement('strong');
    const second = document.createElement('span');
    const reactions: string[] = [];
    let observedChildren: unknown[] = [];

    class MovingAfterElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('connected');
      }

      disconnectedCallback() {
        reactions.push('disconnected');
        observedChildren = [...parent.childNodes];
      }
    }

    polyfillWindow.customElements.define(
      'moving-after-element',
      MovingAfterElement as unknown as CustomElementConstructor,
    );

    const first = document.createElement('moving-after-element');
    parent.append(receiver, trailing);
    document.body.append(parent, first);
    reactions.length = 0;

    receiver.after(first, second);

    expect([...parent.childNodes]).toEqual([receiver, first, second, trailing]);
    expect(observedChildren).toEqual([receiver, first, second, trailing]);
    expect(reactions).toEqual(['disconnected', 'connected']);
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

describe.each(['before', 'after', 'replaceWith'] as const)(
  'ChildNode.%s prevalidation',
  (method) => {
    it('converts arguments for a detached receiver', () => {
      const receiver = document.createElement('span');
      let conversions = 0;
      const value = {
        toString() {
          conversions += 1;
          return 'converted';
        },
      };

      (receiver as any)[method](value);

      expect(conversions).toBe(1);
      expect(receiver.parentNode).toBeNull();
    });

    it('uses the receiver parent after argument conversion', () => {
      const originalParent = document.createElement('div');
      const convertedParent = document.createElement('section');
      const receiver = document.createElement('span');
      originalParent.appendChild(receiver);
      const value = {
        toString() {
          convertedParent.appendChild(receiver);
          return 'converted';
        },
      };

      (receiver as any)[method](value);

      expect(originalParent.childNodes).toHaveLength(0);
      if (method === 'before') {
        expect([...convertedParent.childNodes]).toEqual([
          expect.objectContaining({data: 'converted'}),
          receiver,
        ]);
      } else if (method === 'after') {
        expect([...convertedParent.childNodes]).toEqual([
          receiver,
          expect.objectContaining({data: 'converted'}),
        ]);
      } else {
        expect([...convertedParent.childNodes]).toEqual([
          expect.objectContaining({data: 'converted'}),
        ]);
        expect(receiver.parentNode).toBeNull();
      }
    });

    it('converts earlier arguments before rejecting a later cycle', () => {
      const parent = document.createElement('div');
      const receiver = document.createElement('span');
      parent.appendChild(receiver);
      const conversionError = new TypeError('conversion failed');
      let conversions = 0;
      let thrown: unknown;
      const value = {
        toString() {
          conversions++;
          throw conversionError;
        },
      };

      try {
        (receiver as any)[method](value, parent);
      } catch (error) {
        thrown = error;
      }

      expect(conversions).toBe(1);
      expect(thrown).toBe(conversionError);
      expect([...parent.childNodes]).toEqual([receiver]);
    });

    it('rejects template-host cycles before moving earlier arguments', () => {
      const holder = document.createElement('div');
      const template = document.createElement('template');
      const receiver = document.createElement('span');
      const source = document.createElement('div');
      const movable = document.createElement('em');
      holder.appendChild(template);
      template.content.appendChild(receiver);
      source.appendChild(movable);
      const hooks: string[] = [];
      polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');
      polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');

      expect(() => (receiver as any)[method](movable, template)).toThrow();

      expect([...holder.childNodes]).toEqual([template]);
      expect([...template.content.childNodes]).toEqual([receiver]);
      expect([...source.childNodes]).toEqual([movable]);
      expect(hooks).toEqual([]);
    });
  },
);

import {describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../constants.ts';
import type {WindowExtension} from '../extensions.ts';
import type {Hooks} from '../hooks.ts';
import {Window} from '../Window.ts';

describe('Window extensions', () => {
  it('creates reusable Window subclasses', () => {
    const installs: string[] = [];
    const first = extension('first', () => {
      installs.push('first');
    });
    const second = extension('second', () => {
      installs.push('second');
    });
    const ExtendedWindow = Window.with(first, second);

    const firstWindow = new ExtendedWindow();
    const secondWindow = new ExtendedWindow();

    expect(firstWindow).toBeInstanceOf(Window);
    expect(secondWindow).toBeInstanceOf(Window);
    expect(installs).toEqual(['first', 'second', 'first', 'second']);
  });

  it('composes extensions across successive calls to with()', () => {
    const installs: string[] = [];
    const FirstWindow = Window.with(
      extension('first', () => {
        installs.push('first');
      }),
    );
    const ExtendedWindow = FirstWindow.with(
      extension('second', () => {
        installs.push('second');
      }),
    );

    new ExtendedWindow();

    expect(installs).toEqual(['first', 'second']);
  });

  it('rejects duplicate extension names', () => {
    const first = extension('duplicate', () => {});
    const duplicate = extension('duplicate', () => {});
    const ExtendedWindow = Window.with(first, duplicate);
    const ChainedWindow = Window.with(first).with(duplicate);

    expect(() => new ExtendedWindow()).toThrow(
      'An extension named "duplicate" is already installed on this window.',
    );
    expect(() => new ChainedWindow()).toThrow(
      'An extension named "duplicate" is already installed on this window.',
    );
  });

  it('dispatches DOM operations to installed hook subscriptions', () => {
    const hooks = {
      createElement: vi.fn<Hooks['createElement']>(),
      setAttribute: vi.fn<Hooks['setAttribute']>(),
      removeAttribute: vi.fn<Hooks['removeAttribute']>(),
      createText: vi.fn<Hooks['createText']>(),
      setText: vi.fn<Hooks['setText']>(),
      insertChild: vi.fn<Hooks['insertChild']>(),
      removeChild: vi.fn<Hooks['removeChild']>(),
      addEventListener: vi.fn<Hooks['addEventListener']>(),
      removeEventListener: vi.fn<Hooks['removeEventListener']>(),
    } satisfies Hooks;
    const ExtendedWindow = Window.with(extension('hooks', () => hooks));
    const window = new ExtendedWindow();

    const parent = window.document.createElement('parent');
    const child = window.document.createElement('child');
    const text = window.document.createTextNode('initial');
    const listener = () => {};

    parent.setAttribute('attribute', 'value');
    parent.removeAttribute('attribute');
    text.data = 'updated';
    parent.appendChild(child);
    parent.removeChild(child);
    parent.addEventListener('event', listener);
    parent.removeEventListener('event', listener);

    expect(hooks.createElement).toHaveBeenCalledTimes(2);
    expect(hooks.createText).toHaveBeenCalledOnce();
    expect(hooks.setText).toHaveBeenCalledOnce();
    expect(hooks.setAttribute).toHaveBeenCalledOnce();
    expect(hooks.removeAttribute).toHaveBeenCalledOnce();
    expect(hooks.insertChild).toHaveBeenCalledOnce();
    expect(hooks.removeChild).toHaveBeenCalledOnce();
    expect(hooks.addEventListener).toHaveBeenCalledOnce();
    expect(hooks.removeEventListener).toHaveBeenCalledOnce();
  });

  it('dispatches extension hooks in installation order before legacy hooks', () => {
    const calls: string[] = [];
    const ExtendedWindow = Window.with(
      extension('first', () => ({
        createElement: () => calls.push('first'),
      })),
      extension('second', () => ({
        createElement: () => calls.push('second'),
      })),
    );
    const window = new ExtendedWindow();

    window[HOOKS].createElement = () => calls.push('legacy');
    window.document.createElement('element');

    expect(calls).toEqual(['first', 'second', 'legacy']);
  });

  it('resolves legacy hooks assigned after construction', () => {
    const extensionHook = vi.fn();
    const legacyHook = vi.fn();
    const ExtendedWindow = Window.with(
      extension('extension', () => ({insertChild: extensionHook})),
    );
    const window = new ExtendedWindow();
    const parent = window.document.createElement('parent');
    const child = window.document.createElement('child');

    window[HOOKS].insertChild = legacyHook;
    parent.appendChild(child);

    expect(extensionHook).toHaveBeenCalledOnce();
    expect(legacyHook).toHaveBeenCalledOnce();
  });

  it('creates independent subscriptions for each Window instance', () => {
    const subscriptionCounts: Array<() => number> = [];
    const ExtendedWindow = Window.with(
      extension('stateful', () => {
        let count = 0;
        subscriptionCounts.push(() => count);

        return {
          setText: () => count++,
        };
      }),
    );
    const firstWindow = new ExtendedWindow();
    new ExtendedWindow();

    firstWindow.document.createTextNode('').data = 'updated';

    expect(subscriptionCounts.map((readCount) => readCount())).toEqual([1, 0]);
  });

  it('supports extensions that only install APIs', () => {
    class CustomMutationObserver {}

    const ExtendedWindow = Window.with(
      extension('mutation-observer', (window) => {
        window.MutationObserver = CustomMutationObserver;
      }),
    );
    const window = new ExtendedWindow();

    expect(window.MutationObserver).toBe(CustomMutationObserver);
  });
});

function extension(
  name: string,
  install: WindowExtension['install'],
): WindowExtension {
  return {name, install};
}

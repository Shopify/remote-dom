import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  attributeObserversActive,
  characterDataObserversActive,
  childListObserversActive,
  type MutationCallback,
} from '../MutationObserver.ts';
import {Window} from '../Window.ts';

describe('MutationObserver', () => {
  let window: Window;
  let observers: InstanceType<Window['MutationObserver']>[];

  beforeEach(() => {
    window = new Window();
    observers = [];
  });

  afterEach(() => {
    for (const observer of observers) observer.disconnect();
  });

  function createObserver(callback: MutationCallback) {
    const observer = new window.MutationObserver(callback);
    observers.push(observer);
    return observer;
  }

  it('only enables tracking for mutation types that are observed', () => {
    const first = createObserver(() => {});
    const second = createObserver(() => {});
    const target = window.document.createElement('div');

    expect(attributeObserversActive).toBe(false);
    expect(characterDataObserversActive).toBe(false);
    expect(childListObserversActive).toBe(false);

    first.observe(target, {attributes: true});
    first.observe(target, {attributes: true, attributeOldValue: true});
    expect(attributeObserversActive).toBe(true);
    expect(characterDataObserversActive).toBe(false);
    expect(childListObserversActive).toBe(false);

    first.observe(target, {childList: true});
    second.observe(target, {characterData: true});
    expect(attributeObserversActive).toBe(false);
    expect(characterDataObserversActive).toBe(true);
    expect(childListObserversActive).toBe(true);

    first.disconnect();
    expect(characterDataObserversActive).toBe(true);
    expect(childListObserversActive).toBe(false);

    second.disconnect();
    expect(attributeObserversActive).toBe(false);
    expect(characterDataObserversActive).toBe(false);
    expect(childListObserversActive).toBe(false);
  });

  it('observes and batches child-list changes', async () => {
    const callback = vi.fn();
    const observer = createObserver(callback);
    const parent = window.document.createElement('div');
    const first = window.document.createElement('span');
    const second = window.document.createElement('span');

    observer.observe(parent, {childList: true});
    parent.append(first, second);
    parent.removeChild(first);

    expect(callback).not.toHaveBeenCalled();
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          type: 'childList',
          target: parent,
          addedNodes: [first],
          removedNodes: [],
        }),
        expect.objectContaining({
          type: 'childList',
          target: parent,
          addedNodes: [second],
          removedNodes: [],
          previousSibling: first,
        }),
        expect.objectContaining({
          type: 'childList',
          target: parent,
          addedNodes: [],
          removedNodes: [first],
          nextSibling: second,
        }),
      ],
      observer,
    );
  });

  it('observes filtered attributes in a subtree with old values', async () => {
    const callback = vi.fn();
    const observer = createObserver(callback);
    const parent = window.document.createElement('div');
    const child = window.document.createElement('span');
    parent.appendChild(child);

    observer.observe(parent, {
      attributes: true,
      attributeFilter: ['data-state'],
      attributeOldValue: true,
      subtree: true,
    });
    child.setAttribute('data-state', 'loading');
    child.setAttribute('data-state', 'ready');
    child.setAttribute('ignored', 'value');

    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          type: 'attributes',
          target: child,
          attributeName: 'data-state',
          oldValue: null,
        }),
        expect.objectContaining({
          type: 'attributes',
          target: child,
          attributeName: 'data-state',
          oldValue: 'loading',
        }),
      ],
      observer,
    );
  });

  it('observes character data and only exposes old values when requested', async () => {
    const withOldValue = vi.fn();
    const withoutOldValue = vi.fn();
    const text = window.document.createTextNode('before');

    createObserver(withOldValue).observe(text, {
      characterData: true,
      characterDataOldValue: true,
    });
    createObserver(withoutOldValue).observe(text, {
      characterData: true,
    });
    text.data = 'after';

    await Promise.resolve();

    expect(withOldValue.mock.calls[0]![0][0].oldValue).toBe('before');
    expect(withoutOldValue.mock.calls[0]![0][0].oldValue).toBeNull();
  });

  it('supports takeRecords() and disconnect()', async () => {
    const callback = vi.fn();
    const observer = createObserver(callback);
    const parent = window.document.createElement('div');

    observer.observe(parent, {childList: true});
    parent.append('first');

    expect(observer.takeRecords()).toHaveLength(1);

    parent.append('second');
    observer.disconnect();
    parent.append('third');
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
    expect(observer.takeRecords()).toEqual([]);
  });

  it('validates the callback and observation options', () => {
    expect(() => new window.MutationObserver(null as any)).toThrow(TypeError);

    const observer = createObserver(() => {});
    const target = window.document.createElement('div');

    expect(() => observer.observe(target)).toThrow(TypeError);
    expect(() =>
      observer.observe(target, {
        attributes: false,
        attributeOldValue: true,
      }),
    ).toThrow(TypeError);
    expect(() =>
      observer.observe(target, {
        characterData: false,
        characterDataOldValue: true,
      }),
    ).toThrow(TypeError);
  });
});

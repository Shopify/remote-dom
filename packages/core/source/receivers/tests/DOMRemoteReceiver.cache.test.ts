// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
} from '../../constants.ts';
import type {RemoteElementSerialization} from '../../types.ts';
import {DOMRemoteReceiver} from '../DOMRemoteReceiver.ts';

function element(
  id: string,
  children: readonly RemoteElementSerialization[] = [],
  properties: Record<string, unknown> = {},
): RemoteElementSerialization {
  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element: 'div',
    properties,
    children,
  };
}

function insert(
  receiver: DOMRemoteReceiver,
  parent: string,
  child: RemoteElementSerialization,
  index = 0,
) {
  receiver.connection.mutate([
    [MUTATION_TYPE_INSERT_CHILD, parent, child, index],
  ]);
}

function remove(receiver: DOMRemoteReceiver, parent: string, index = 0) {
  receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, parent, index]]);
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('DOMRemoteReceiver cache', () => {
  it('stops targeting and reusing a removed element without caching', () => {
    const receiver = new DOMRemoteReceiver();
    const child = element('child', [], {value: 'before'});
    insert(receiver, ROOT_ID, child);

    const removed = receiver.root.firstChild as HTMLElement & {
      ping(): void;
      value: string;
    };
    const ping = vi.fn();
    removed.ping = ping;

    remove(receiver, ROOT_ID);

    expect(() => receiver.connection.call('child', 'ping')).toThrow();
    expect(ping).not.toHaveBeenCalled();
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'child', 'value', 'after'],
      ]),
    ).toThrow();
    expect(removed.value).toBe('before');

    insert(receiver, ROOT_ID, child);
    expect(receiver.root.firstChild).not.toBe(removed);
  });

  it('reuses an element before cache expiry and recreates it after expiry', () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const receiver = new DOMRemoteReceiver({
      cache: {maxAge: 100},
      release,
    });
    const child = element('child');
    insert(receiver, ROOT_ID, child);
    const original = receiver.root.firstChild;

    remove(receiver, ROOT_ID);
    vi.advanceTimersByTime(50);
    insert(receiver, ROOT_ID, child);
    expect(receiver.root.firstChild).toBe(original);

    vi.advanceTimersByTime(100);
    expect(receiver.root.firstChild).toBe(original);
    expect(release).not.toHaveBeenCalled();

    remove(receiver, ROOT_ID);
    vi.advanceTimersByTime(100);
    expect(release).toHaveBeenCalledOnce();
    insert(receiver, ROOT_ID, child);
    expect(receiver.root.firstChild).not.toBe(original);
  });

  it('expires sibling cache entries independently', () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const receiver = new DOMRemoteReceiver({
      cache: {maxAge: 100},
      release,
    });
    const first = element('first');
    const second = element('second');
    insert(receiver, ROOT_ID, first);
    insert(receiver, ROOT_ID, second, 1);
    const originalFirst = receiver.root.childNodes[0];
    const originalSecond = receiver.root.childNodes[1];

    remove(receiver, ROOT_ID);
    remove(receiver, ROOT_ID);
    vi.advanceTimersByTime(100);
    expect(release).toHaveBeenCalledTimes(2);

    insert(receiver, ROOT_ID, first);
    insert(receiver, ROOT_ID, second, 1);
    expect(receiver.root.childNodes[0]).not.toBe(originalFirst);
    expect(receiver.root.childNodes[1]).not.toBe(originalSecond);
  });

  it('cancels cache expiry when an element moves to another parent', () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const receiver = new DOMRemoteReceiver({
      cache: {maxAge: 100},
      release,
    });
    const parentA = element('parent-a');
    const parentB = element('parent-b');
    const child = element('child', [], {value: 'before'});
    insert(receiver, ROOT_ID, parentA);
    insert(receiver, ROOT_ID, parentB, 1);
    insert(receiver, 'parent-a', child);

    const original = receiver.root.firstChild!.firstChild as HTMLElement & {
      ping(): void;
    };
    const ping = vi.fn();
    original.ping = ping;

    remove(receiver, 'parent-a');
    insert(receiver, 'parent-b', child);
    vi.advanceTimersByTime(100);

    expect(receiver.root.childNodes[1]!.firstChild).toBe(original);
    expect(release).not.toHaveBeenCalled();
    receiver.connection.call('child', 'ping');
    expect(ping).toHaveBeenCalledOnce();
  });
});

import {describe, expect, it, vi} from 'vitest';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  type RemoteElementSerialization,
  type RemoteTextSerialization,
} from '@remote-dom/core';

import {SignalRemoteReceiver} from '../SignalRemoteReceiver.ts';

describe('SignalRemoteReceiver', () => {
  describe('late mutations on detached nodes', () => {
    /**
     * These tests cover a class of race condition where the remote sender
     * dispatches a mutation for a node whose receiver-side state has already
     * been removed (e.g. an ancestor `removeChild` was processed earlier in
     * the same batch, or a separate teardown mutation arrived first).
     *
     * The receiver should treat each of these as a no-op rather than throwing
     * a `TypeError` while dereferencing the missing node — those throws
     * surface to consumers as unhandled promise rejections.
     */

    it('drops insertChild for a parent that has been detached', () => {
      const receiver = new SignalRemoteReceiver();

      const element = elementSerialization('host', '1');
      const child = textSerialization('child', '2');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      const rootChildrenBefore = [...receiver.root.children.value];

      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_INSERT_CHILD, '1', child, 0],
        ]),
      ).not.toThrow();

      // Confirm the receiver is a true no-op: the late child was never
      // attached and the existing tree is unchanged.
      expect(receiver.root.children.value).toStrictEqual(rootChildrenBefore);
      expect(receiver.root.children.value).toHaveLength(0);
      expect(receiver.get({id: '2'})).toBeUndefined();
    });

    it('drops removeChild for a parent that has been detached', () => {
      const receiver = new SignalRemoteReceiver();

      const parent = elementSerialization('host', '1', [
        textSerialization('inner', '2'),
      ]);

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, parent, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      const rootChildrenBefore = [...receiver.root.children.value];

      expect(() =>
        receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, '1', 0]]),
      ).not.toThrow();

      expect(receiver.root.children.value).toStrictEqual(rootChildrenBefore);
      expect(receiver.root.children.value).toHaveLength(0);
    });

    it('drops updateProperty for an element that has been detached', () => {
      const receiver = new SignalRemoteReceiver();

      const element = elementSerialization('host', '1');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      // The default `type` is UPDATE_PROPERTY_TYPE_PROPERTY — historically the
      // line that produced `TypeError: ... 'x.properties'` in production.
      for (const updateType of [
        undefined,
        UPDATE_PROPERTY_TYPE_PROPERTY,
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
      ] as const) {
        expect(() =>
          receiver.connection.mutate([
            [MUTATION_TYPE_UPDATE_PROPERTY, '1', 'value', 'late', updateType],
          ]),
        ).not.toThrow();

        // The detached element stays detached; the late write did not
        // re-materialize it.
        expect(receiver.get({id: '1'})).toBeUndefined();
      }
    });

    it('does not call retain/release for late updateProperty mutations', () => {
      const retain = vi.fn();
      const release = vi.fn();
      const receiver = new SignalRemoteReceiver({retain, release});

      const element = elementSerialization('host', '1');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      retain.mockClear();
      release.mockClear();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'value',
          {ref: true},
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]);

      expect(retain).not.toHaveBeenCalled();
      expect(release).not.toHaveBeenCalled();
    });

    it('still calls retain/release for updateProperty on an attached element', () => {
      // Counterpart to the late-mutation case above: the guard must not
      // accidentally short-circuit retain/release on the happy path.
      const retain = vi.fn();
      const release = vi.fn();
      const receiver = new SignalRemoteReceiver({retain, release});

      const element = elementSerialization('host', '1');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);

      // Seed an existing property value so the next update has a real
      // old value to release.
      const oldValue = {ref: 'old'};
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'value',
          oldValue,
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]);

      retain.mockClear();
      release.mockClear();

      const newValue = {ref: 'new'};
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'value',
          newValue,
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]);

      expect(retain).toHaveBeenCalledWith(newValue);
      expect(release).toHaveBeenCalledWith(oldValue);
    });

    it('drops updateText for a text node that has been detached', () => {
      const receiver = new SignalRemoteReceiver();

      const text = textSerialization('hello', '1');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, text, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_TEXT, '1', 'late text'],
        ]),
      ).not.toThrow();

      expect(receiver.get({id: '1'})).toBeUndefined();
    });

    it('handles a removeChild + updateProperty pair delivered in the same batch', () => {
      // This mirrors the production race: a single batched payload contains
      // a removal of a node and a subsequent property update on a descendant
      // that has just been detached in the same batch.
      const receiver = new SignalRemoteReceiver();

      const element = elementSerialization('host', '1', [
        elementSerialization('inner', '2'),
      ]);

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);

      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0],
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '2',
            'value',
            'late',
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]),
      ).not.toThrow();

      // Both nodes are detached after the batch; the late write left
      // no residue.
      expect(receiver.root.children.value).toHaveLength(0);
      expect(receiver.get({id: '1'})).toBeUndefined();
      expect(receiver.get({id: '2'})).toBeUndefined();
    });

    it('still throws an explicit no-implementation error for call() on a detached id', () => {
      // The `call` callback is intentionally not guarded by the late-mutation
      // pattern: callers should see a clear error rather than a silent no-op
      // when invoking a method on a node that no longer has an implementation.
      const receiver = new SignalRemoteReceiver();

      const element = elementSerialization('host', '1');

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element, 0],
      ]);
      receiver.connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]]);

      expect(() => receiver.connection.call('1', 'doSomething')).toThrow(
        'Node 1 does not implement the doSomething() method',
      );
    });
  });
});

function elementSerialization(
  element: string,
  id: string,
  children: ReadonlyArray<
    RemoteElementSerialization | RemoteTextSerialization
  > = [],
): RemoteElementSerialization {
  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element,
    properties: {},
    attributes: {},
    eventListeners: {},
    children,
  };
}

function textSerialization(data: string, id: string): RemoteTextSerialization {
  return {
    id,
    type: NODE_TYPE_TEXT,
    data,
  };
}

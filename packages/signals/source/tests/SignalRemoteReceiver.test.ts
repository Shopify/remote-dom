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

import {
  SignalRemoteReceiver,
  type SignalRemoteReceiverElement,
  type SignalRemoteReceiverText,
} from '../SignalRemoteReceiver.ts';

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

  describe('untrusted values', () => {
    /**
     * The remote is untrusted, and this receiver feeds Preact directly.
     * Preact treats any object whose `constructor` resolves to `undefined` as
     * a virtual node, so such objects must never be stored where a renderer
     * expects a string, and must be rejected as property values.
     */

    function vnodeShaped() {
      return {constructor: undefined, type: 'div', props: {}, __b: 1};
    }

    it('stores strings for text content', () => {
      const receiver = new SignalRemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {id: '1', type: NODE_TYPE_TEXT, data: vnodeShaped()} as any,
          0,
        ],
      ]);

      const text = receiver.get<SignalRemoteReceiverText>({id: '1'})!;
      expect(text.data.value).toBe('[object Object]');

      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_TEXT, '1', Object.create(null)],
      ]);
      expect(text.data.value).toBe('[object Object]');

      receiver.connection.mutate([[MUTATION_TYPE_UPDATE_TEXT, '1', 7 as any]]);
      expect(text.data.value).toBe('7');

      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_TEXT, '1', undefined as any],
      ]);
      expect(text.data.value).toBe('');
    });

    it('stores strings for attributes and removes them on nullish updates', () => {
      const receiver = new SignalRemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            ...elementSerialization('host', '1'),
            attributes: {heading: vnodeShaped(), count: 1, gone: null} as any,
          },
          0,
        ],
      ]);

      const element = receiver.get<SignalRemoteReceiverElement>({id: '1'})!;
      expect(element.attributes.value).toStrictEqual({
        heading: '[object Object]',
        count: '1',
      });

      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          Object.create(null),
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
      expect(element.attributes.value.heading).toBe('[object Object]');

      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          null,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
      expect(element.attributes.value).toStrictEqual({count: '1'});
    });

    it('rejects vnode-shaped property values', () => {
      const receiver = new SignalRemoteReceiver();

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              ...elementSerialization('host', '1'),
              properties: {heading: vnodeShaped()},
            },
            0,
          ],
        ]),
      ).toThrow(/masquerades/);
      expect(receiver.root.children.value).toHaveLength(0);

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {...elementSerialization('host', '1'), properties: {heading: 'Hi'}},
          0,
        ],
      ]);

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            'heading',
            {nested: [vnodeShaped()]},
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]),
      ).toThrow(/masquerades/);

      const element = receiver.get<SignalRemoteReceiverElement>({id: '1'})!;
      expect(element.properties.value).toStrictEqual({heading: 'Hi'});
    });

    describe.each(['inherited property', 'Error cause'] as const)(
      'vnode hidden in %s',
      (variant) => {
        function unsafeValue() {
          const vnode = vnodeShaped();
          return variant === 'inherited property'
            ? Object.create({label: vnode})
            : structuredClone(new Error('remote error', {cause: vnode}));
        }

        it('rejects an initial property before retaining or attaching the node', () => {
          const retain = vi.fn();
          const receiver = new SignalRemoteReceiver({retain});

          expect(() =>
            receiver.connection.mutate([
              [
                MUTATION_TYPE_INSERT_CHILD,
                ROOT_ID,
                {
                  ...elementSerialization('host', '1'),
                  properties: {heading: unsafeValue()},
                },
                0,
              ],
            ]),
          ).toThrow(/masquerades/);

          expect(receiver.get({id: '1'})).toBeUndefined();
          expect(retain).not.toHaveBeenCalled();
        });

        it('rejects a property update and keeps the previous value', () => {
          const receiver = new SignalRemoteReceiver();
          receiver.connection.mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              {
                ...elementSerialization('host', '1'),
                properties: {heading: 'safe'},
              },
              0,
            ],
          ]);

          expect(() =>
            receiver.connection.mutate([
              [
                MUTATION_TYPE_UPDATE_PROPERTY,
                '1',
                'heading',
                unsafeValue(),
                UPDATE_PROPERTY_TYPE_PROPERTY,
              ],
            ]),
          ).toThrow(/masquerades/);
          expect(
            receiver.get<SignalRemoteReceiverElement>({id: '1'})!.properties
              .value,
          ).toStrictEqual({heading: 'safe'});
        });
      },
    );

    it('rejects non-function initial event listeners before retaining the node', () => {
      const retain = vi.fn();
      const receiver = new SignalRemoteReceiver({retain});
      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              ...elementSerialization('host', '1'),
              eventListeners: {press: {} as any},
            },
            0,
          ],
        ]),
      ).toThrow('Remote event listener is not a function');
      expect(receiver.get({id: '1'})).toBeUndefined();
      expect(retain).not.toHaveBeenCalled();
    });

    it('rejects non-function event listeners and __proto__ names', () => {
      const receiver = new SignalRemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          elementSerialization('host', '1'),
          0,
        ],
      ]);

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            'press',
            {},
            UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
          ],
        ]),
      ).toThrow(/not a function/);

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            '__proto__',
            {polluted: true},
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]),
      ).toThrow(/name is not allowed/);

      const element = receiver.get<SignalRemoteReceiverElement>({id: '1'})!;
      expect((element.properties.value as any).polluted).toBeUndefined();
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

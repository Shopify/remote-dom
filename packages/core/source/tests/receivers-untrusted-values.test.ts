import {describe, expect, it, vi} from 'vitest';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../constants.ts';
import {
  RemoteReceiver,
  type RemoteReceiverElement,
  type RemoteReceiverText,
} from '../receivers/RemoteReceiver.ts';
import {
  assertSafeRemoteProperty,
  normalizeRemoteAttribute,
  normalizeRemoteText,
} from '../receivers/shared.ts';

/**
 * Objects shaped like a Preact virtual node. `constructor: undefined` as an
 * own property survives structured cloning; a `null` prototype is what the
 * thread deserializer produces from a literal `__proto__` key.
 */
function vnodeWithOwnConstructor() {
  return {
    constructor: undefined,
    type: 'div',
    props: {dangerouslySetInnerHTML: {__html: '<b>x</b>'}},
    __b: 1,
  };
}

function vnodeWithNullPrototype() {
  const vnode = Object.create(null);
  Object.assign(vnode, {type: 'div', props: {}, __b: 1});
  return vnode;
}

function element(id: string, extra: Partial<Record<string, any>> = {}) {
  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element: 'ui-element',
    children: [],
    ...extra,
  } as any;
}

describe('receiver helpers', () => {
  describe('normalizeRemoteText()', () => {
    it('keeps strings', () => {
      expect(normalizeRemoteText('hi')).toBe('hi');
    });

    it('coerces primitives', () => {
      expect(normalizeRemoteText(1)).toBe('1');
      expect(normalizeRemoteText(true)).toBe('true');
      expect(normalizeRemoteText(10n)).toBe('10');
    });

    it('turns nullish values into an empty string', () => {
      expect(normalizeRemoteText(null)).toBe('');
      expect(normalizeRemoteText(undefined)).toBe('');
    });

    it('describes objects without invoking their methods', () => {
      const toString = vi.fn(() => 'from remote');
      const valueOf = vi.fn(() => 'from remote');
      const toPrimitive = vi.fn(() => 'from remote');

      expect(
        normalizeRemoteText({
          toString,
          valueOf,
          [Symbol.toPrimitive]: toPrimitive,
        }),
      ).toBe('[object Object]');
      expect(normalizeRemoteText(vnodeWithOwnConstructor())).toBe(
        '[object Object]',
      );
      expect(normalizeRemoteText(vnodeWithNullPrototype())).toBe(
        '[object Object]',
      );
      expect(normalizeRemoteText([1, 2])).toBe('[object Array]');
      expect(normalizeRemoteText(() => {})).toBe('[object Function]');

      expect(toString).not.toHaveBeenCalled();
      expect(valueOf).not.toHaveBeenCalled();
      expect(toPrimitive).not.toHaveBeenCalled();
    });
  });

  describe('normalizeRemoteAttribute()', () => {
    it('treats nullish values as removal', () => {
      expect(normalizeRemoteAttribute(null)).toBeUndefined();
      expect(normalizeRemoteAttribute(undefined)).toBeUndefined();
    });

    it('returns a string for everything else', () => {
      expect(normalizeRemoteAttribute('a')).toBe('a');
      expect(normalizeRemoteAttribute(0)).toBe('0');
      expect(normalizeRemoteAttribute(vnodeWithOwnConstructor())).toBe(
        '[object Object]',
      );
    });
  });

  describe('assertSafeRemoteProperty()', () => {
    it('accepts ordinary data', () => {
      expect(() =>
        assertSafeRemoteProperty({
          a: 1,
          b: 'two',
          c: [1, {d: null}],
          e: new Map([['k', {f: true}]]),
          g: new Set([1]),
          h: () => {},
          i: new Date(),
          j: Object.create(Object.prototype),
        }),
      ).not.toThrow();
    });

    it('accepts cyclic data', () => {
      const cyclic: any = {items: []};
      cyclic.items.push(cyclic);
      cyclic.self = cyclic;
      expect(() => assertSafeRemoteProperty(cyclic)).not.toThrow();
    });

    it('rejects an object with an own undefined constructor', () => {
      expect(() => assertSafeRemoteProperty(vnodeWithOwnConstructor())).toThrow(
        /masquerades/,
      );
    });

    it('rejects an object with a null prototype', () => {
      expect(() => assertSafeRemoteProperty(vnodeWithNullPrototype())).toThrow(
        /masquerades/,
      );
    });

    it('rejects a vnode-shaped object anywhere in the value', () => {
      expect(() =>
        assertSafeRemoteProperty({items: ['ok', vnodeWithOwnConstructor()]}),
      ).toThrow();
      expect(() =>
        assertSafeRemoteProperty({deep: {deeper: vnodeWithNullPrototype()}}),
      ).toThrow();
      expect(() =>
        assertSafeRemoteProperty(new Map([['k', vnodeWithOwnConstructor()]])),
      ).toThrow();
      expect(() =>
        assertSafeRemoteProperty(new Set([vnodeWithOwnConstructor()])),
      ).toThrow();
    });

    it('rejects a vnode-shaped object hidden behind a redirected prototype', () => {
      // After the wire assigns a `__proto__` key, the container is not a
      // “plain” object anymore, but it still holds attacker data.
      const container = Object.create({});
      container.items = [vnodeWithOwnConstructor()];
      expect(() => assertSafeRemoteProperty(container)).toThrow();
    });

    it('rejects an object whose prototype chain hides the constructor', () => {
      const proto = {constructor: undefined};
      const value = Object.create(proto);
      value.type = 'div';
      expect(() => assertSafeRemoteProperty(value)).toThrow();
    });
  });
});

describe('RemoteReceiver with untrusted values', () => {
  describe('text and comment nodes', () => {
    it('stores a string for non-string initial text content', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_TEXT,
            data: vnodeWithOwnConstructor(),
          } as any,
          0,
        ],
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {id: '2', type: NODE_TYPE_COMMENT, data: 123} as any,
          1,
        ],
      ]);

      expect(receiver.get<RemoteReceiverText>({id: '1'})!.data).toBe(
        '[object Object]',
      );
      expect(receiver.get<RemoteReceiverText>({id: '2'})!.data).toBe('123');
    });

    it('stores a string for non-string text updates', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {id: '1', type: NODE_TYPE_TEXT, data: 'hi'},
          0,
        ],
      ]);

      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_TEXT, '1', vnodeWithNullPrototype()],
      ]);
      expect(receiver.get<RemoteReceiverText>({id: '1'})!.data).toBe(
        '[object Object]',
      );

      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_TEXT, '1', null as any],
      ]);
      expect(receiver.get<RemoteReceiverText>({id: '1'})!.data).toBe('');
    });
  });

  describe('attributes', () => {
    it('stores strings for initial attributes and drops nullish ones', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          element('1', {
            attributes: {
              heading: vnodeWithOwnConstructor(),
              count: 3,
              gone: null,
              fine: 'ok',
            },
          }),
          0,
        ],
      ]);

      expect(
        receiver.get<RemoteReceiverElement>({id: '1'})!.attributes,
      ).toStrictEqual({heading: '[object Object]', count: '3', fine: 'ok'});
    });

    it('stores strings for attribute updates and removes on nullish', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element('1'), 0],
      ]);

      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          vnodeWithNullPrototype(),
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
      expect(
        receiver.get<RemoteReceiverElement>({id: '1'})!.attributes,
      ).toStrictEqual({heading: '[object Object]'});

      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          undefined,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
      expect(
        receiver.get<RemoteReceiverElement>({id: '1'})!.attributes,
      ).toStrictEqual({});
    });
  });

  describe('properties', () => {
    it('rejects vnode-shaped initial properties without attaching the element', () => {
      const retain = vi.fn();
      const receiver = new RemoteReceiver({retain});

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            element('1', {properties: {heading: vnodeWithOwnConstructor()}}),
            0,
          ],
        ]),
      ).toThrow(/masquerades/);

      expect(receiver.get({id: '1'})).toBeUndefined();
      expect(receiver.root.children).toHaveLength(0);
      expect(retain).not.toHaveBeenCalled();
    });

    it('rejects vnode-shaped property updates and keeps the previous value', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          element('1', {properties: {heading: 'Hi'}}),
          0,
        ],
      ]);

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            'heading',
            {items: [vnodeWithNullPrototype()]},
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]),
      ).toThrow();

      expect(
        receiver.get<RemoteReceiverElement>({id: '1'})!.properties,
      ).toStrictEqual({heading: 'Hi'});
    });

    it('still accepts ordinary object and function properties', () => {
      const receiver = new RemoteReceiver();
      const onPress = () => {};

      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          element('1', {
            properties: {options: {a: [1, 2, {b: 'c'}]}, onPress},
          }),
          0,
        ],
      ]);

      expect(
        receiver.get<RemoteReceiverElement>({id: '1'})!.properties,
      ).toStrictEqual({options: {a: [1, 2, {b: 'c'}]}, onPress});
    });
  });

  describe('event listeners', () => {
    it('rejects non-function event listeners', () => {
      const receiver = new RemoteReceiver();

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            element('1', {eventListeners: {press: {not: 'a function'}}}),
            0,
          ],
        ]),
      ).toThrow(/not a function/);

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element('1'), 0],
      ]);

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            'press',
            'nope',
            UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
          ],
        ]),
      ).toThrow(/not a function/);
    });
  });

  describe('names', () => {
    it('rejects __proto__ as a property, attribute, or event listener name', () => {
      const receiver = new RemoteReceiver();

      receiver.connection.mutate([
        [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, element('1'), 0],
      ]);

      for (const type of [
        UPDATE_PROPERTY_TYPE_PROPERTY,
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
      ] as const) {
        expect(() =>
          receiver.connection.mutate([
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              '1',
              '__proto__',
              {polluted: 1},
              type,
            ],
          ]),
        ).toThrow(/name is not allowed/);
      }

      const stored = receiver.get<RemoteReceiverElement>({id: '1'})!;
      expect(Object.getPrototypeOf(stored.properties)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(stored.attributes)).toBe(Object.prototype);
      expect((stored.properties as any).polluted).toBeUndefined();

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            element('2', {
              attributes: JSON.parse('{"__proto__": {"polluted": 1}}'),
            }),
            1,
          ],
        ]),
      ).toThrow(/name is not allowed/);
    });

    it('rejects a non-string element name', () => {
      const receiver = new RemoteReceiver();

      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            element('1', {element: {toString: () => 'ui-element'}}),
            0,
          ],
        ]),
      ).toThrow(/element name/);
    });
  });
});

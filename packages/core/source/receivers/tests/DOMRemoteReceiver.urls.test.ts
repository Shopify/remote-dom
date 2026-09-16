// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';
import {DOMRemoteReceiver} from '../DOMRemoteReceiver.ts';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../../constants.ts';

const channels = [
  UPDATE_PROPERTY_TYPE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
] as const;
const cases = [
  ['a', 'href'],
  ['iframe', 'src'],
  ['form', 'action'],
  ['button', 'formAction'],
  ['object', 'data'],
  ['OBJECT', 'data'],
  ['video', 'poster'],
  ['ui-button', 'href'],
] as const;

function insert(
  receiver: DOMRemoteReceiver,
  element: string,
  name?: string,
  value?: unknown,
  channel = UPDATE_PROPERTY_TYPE_PROPERTY as number,
) {
  receiver.connection.mutate([
    [
      MUTATION_TYPE_INSERT_CHILD,
      ROOT_ID,
      {
        id: 'node',
        type: NODE_TYPE_ELEMENT,
        element,
        children: [],
        ...(name
          ? {
              [channel === UPDATE_PROPERTY_TYPE_ATTRIBUTE
                ? 'attributes'
                : 'properties']: {[name]: value},
            }
          : {}),
      },
      0,
    ],
  ]);
}

describe('DOMRemoteReceiver URL values', () => {
  it.each(cases)(
    'checks initial and updated %s.%s in both channels',
    (element, name) => {
      for (const type of channels) {
        const receiver = new DOMRemoteReceiver({elements: [element]});
        expect(() =>
          insert(receiver, element, name, 'javascript:void 0', type),
        ).toThrow(/not allowed/);
        expect(receiver.root.childNodes).toHaveLength(0);
        insert(receiver, element);
        expect(() =>
          receiver.connection.mutate([
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              'node',
              name,
              'javascript:void 0',
              type,
            ],
          ]),
        ).toThrow(/not allowed/);
      }
    },
  );

  it.each([
    'javascript:void 0',
    'JaVaScRiPt:void 0',
    '\u0000\u001f javascript:void 0',
    'java\tscr\ript:void 0',
    'java\nscript:void 0',
    'vbscript:msgbox(1)',
    'data:text/html,<b>content</b>',
    'DATA:image/svg+xml,<svg></svg>',
    'data:application/xhtml+xml,<html></html>',
  ])('rejects %j even with an explicit member list', (value) => {
    const receiver = new DOMRemoteReceiver({
      elements: {a: {properties: ['href'], attributes: ['href']}},
      blockedProperties: [],
    });
    for (const type of channels) {
      expect(() => insert(receiver, 'a', 'href', value, type)).toThrow(
        /not allowed/,
      );
    }
  });

  it.each([
    '/orders',
    '../orders',
    '#section',
    '?tab=details',
    '',
    'https://example.com/javascript:label',
    'http://example.com',
    'mailto:hello@example.com',
    'tel:+15551234567',
    'data:image/png;base64,aGVsbG8=',
  ])('preserves supported URL value %j', (value) => {
    for (const type of channels) {
      const receiver = new DOMRemoteReceiver({elements: ['a']});
      insert(receiver, 'a', 'href', value, type);
      expect((receiver.root.firstChild as Element).getAttribute('href')).toBe(
        value,
      );
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          'node',
          'href',
          null,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
      expect((receiver.root.firstChild as Element).hasAttribute('href')).toBe(
        false,
      );
    }
  });

  it('does not coerce remote objects into native URL values', () => {
    const toString = vi.fn(() => 'javascript:void 0');
    for (const type of channels) {
      const receiver = new DOMRemoteReceiver({elements: ['a']});
      expect(() => insert(receiver, 'a', 'href', {toString}, type)).toThrow(
        /not allowed/,
      );
      insert(receiver, 'a');
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'node', 'href', {toString}, type],
        ]),
      ).toThrow(/not allowed/);
    }
    expect(toString).not.toHaveBeenCalled();
  });

  it('validates nested values before DOM construction or retaining values', () => {
    const retain = vi.fn();
    const receiver = new DOMRemoteReceiver({
      elements: ['ui-button', 'a'],
      retain,
    });
    const create = vi.spyOn(document, 'createElement');
    try {
      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: 'parent',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-button',
              properties: {label: 'Hello'},
              children: [
                {
                  id: 'link',
                  type: NODE_TYPE_ELEMENT,
                  element: 'a',
                  attributes: {href: 'javascript:void 0'},
                  children: [],
                },
              ],
            },
            0,
          ],
        ]),
      ).toThrow(/not allowed/);
      expect(create).not.toHaveBeenCalled();
      expect(retain).not.toHaveBeenCalled();
    } finally {
      create.mockRestore();
    }
  });

  it('preserves custom component data objects', () => {
    const receiver = new DOMRemoteReceiver({elements: ['ui-button']});
    const data = {label: 'Hello'};
    insert(receiver, 'ui-button', 'data', data);
    expect((receiver.root.firstChild as any).data).toBe(data);
  });
});

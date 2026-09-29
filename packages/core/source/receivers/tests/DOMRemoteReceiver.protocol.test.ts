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

function insert(
  receiver: DOMRemoteReceiver,
  element: string,
  properties?: Record<string, unknown>,
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
        ...(properties ? {properties} : {}),
      },
      0,
    ],
  ]);
}

describe('DOMRemoteReceiver protocol property', () => {
  it('rejects initial protocol property on a with default options', () => {
    const receiver = new DOMRemoteReceiver();
    expect(() =>
      insert(receiver, 'a', {href: 'custom:path', protocol: 'javascript:'}),
    ).toThrow(/not allowed/);
    expect(receiver.root.childNodes).toHaveLength(0);
  });

  it('rejects initial protocol property on area with default options', () => {
    const receiver = new DOMRemoteReceiver();
    expect(() =>
      insert(receiver, 'area', {
        href: 'custom:path',
        protocol: 'javascript:',
      }),
    ).toThrow(/not allowed/);
    expect(receiver.root.childNodes).toHaveLength(0);
  });

  it('rejects initial protocol in element array', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a', 'area', 'div']});
    for (const tag of ['a', 'area']) {
      expect(() =>
        insert(receiver, tag, {href: 'custom:path', protocol: 'javascript:'}),
      ).toThrow(/not allowed/);
    }
  });

  it('rejects initial protocol with member map', () => {
    const receiver = new DOMRemoteReceiver({
      elements: {
        a: {properties: {href: {}, protocol: {}}},
        area: {properties: {href: {}, protocol: {}}},
      },
    });
    for (const tag of ['a', 'area']) {
      expect(() =>
        insert(receiver, tag, {href: 'custom:path', protocol: 'javascript:'}),
      ).toThrow(/not allowed/);
    }
  });

  it('normalizes tag name to lowercase before checking', () => {
    const receiver = new DOMRemoteReceiver({elements: ['A', 'AREA']});
    for (const tag of ['A', 'AREA']) {
      expect(() =>
        insert(receiver, tag, {href: 'custom:path', protocol: 'javascript:'}),
      ).toThrow(/not allowed/);
      expect(receiver.root.childNodes).toHaveLength(0);
    }
  });

  it('rejects non-string protocol values before coercion', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    const toString = vi.fn(() => 'javascript:');
    expect(() =>
      insert(receiver, 'a', {href: 'custom:path', protocol: {toString}}),
    ).toThrow(/not allowed/);
    expect(receiver.root.childNodes).toHaveLength(0);
    insert(receiver, 'a', {href: 'custom:path'});
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'node', 'protocol', {toString}],
      ]),
    ).toThrow(/not allowed/);
    expect(toString).not.toHaveBeenCalled();
  });

  it('validates before calling retain', () => {
    const retain = vi.fn();
    const receiver = new DOMRemoteReceiver({elements: ['a'], retain});
    expect(() =>
      insert(receiver, 'a', {href: 'custom:path', protocol: 'javascript:'}),
    ).toThrow(/not allowed/);
    expect(retain).not.toHaveBeenCalled();
    insert(receiver, 'a', {href: 'custom:path'});
    retain.mockClear();
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'node', 'protocol', 'javascript:'],
      ]),
    ).toThrow(/not allowed/);
    expect(retain).not.toHaveBeenCalled();
  });

  it('validates before calling DOM setters', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    const setter = vi
      .spyOn(HTMLAnchorElement.prototype, 'protocol', 'set')
      .mockImplementation(() => {});
    try {
      expect(() =>
        insert(receiver, 'a', {href: 'custom:path', protocol: 'javascript:'}),
      ).toThrow(/not allowed/);
      insert(receiver, 'a', {href: 'custom:path'});
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'node', 'protocol', 'javascript:'],
        ]),
      ).toThrow(/not allowed/);
      expect(setter).not.toHaveBeenCalled();
    } finally {
      setter.mockRestore();
    }
  });

  it('rejects null and undefined protocol values', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    for (const value of [null, undefined]) {
      expect(() =>
        insert(receiver, 'a', {href: 'custom:path', protocol: value}),
      ).toThrow(/not allowed/);
      expect(receiver.root.childNodes).toHaveLength(0);
    }
    insert(receiver, 'a', {href: 'custom:path'});
    for (const value of [null, undefined]) {
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'node', 'protocol', value],
        ]),
      ).toThrow(/not allowed/);
    }
  });

  it('rejects colonless variant', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    expect(() =>
      insert(receiver, 'a', {href: 'custom:path', protocol: 'javascript'}),
    ).toThrow(/not allowed/);
    expect(receiver.root.childNodes).toHaveLength(0);
  });

  it('rejects array variant', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    expect(() =>
      insert(receiver, 'a', {
        href: 'custom:path',
        protocol: ['javascript:'],
      }),
    ).toThrow(/not allowed/);
    expect(receiver.root.childNodes).toHaveLength(0);
  });

  it('rejects updated protocol property', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    insert(receiver, 'a', {href: 'custom:path'});
    const original = (receiver.root.firstChild as HTMLAnchorElement).href;
    expect(() =>
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          'node',
          'protocol',
          'javascript:',
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]),
    ).toThrow(/not allowed/);
    expect((receiver.root.firstChild as HTMLAnchorElement).href).toBe(original);
  });

  it('preserves safe full href updates', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    insert(receiver, 'a', {href: 'https://example.com/old'});
    receiver.connection.mutate([
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'node',
        'href',
        'https://example.com/new',
        UPDATE_PROPERTY_TYPE_PROPERTY,
      ],
    ]);
    expect((receiver.root.firstChild as HTMLAnchorElement).href).toBe(
      'https://example.com/new',
    );
  });

  it('allows protocol property on custom elements', () => {
    customElements.define(
      'ui-link',
      class extends HTMLElement {
        protocol = '';
      },
    );
    const receiver = new DOMRemoteReceiver({elements: ['ui-link']});
    insert(receiver, 'ui-link', {protocol: 'javascript:'});
    expect((receiver.root.firstChild as any).protocol).toBe('javascript:');
  });

  it('does not reject protocol attribute mutations', () => {
    const receiver = new DOMRemoteReceiver({elements: ['a']});
    insert(receiver, 'a', {href: 'https://example.com'});
    receiver.connection.mutate([
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'node',
        'protocol',
        'javascript:',
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ],
    ]);
    expect(
      (receiver.root.firstChild as HTMLAnchorElement).getAttribute('protocol'),
    ).toBe('javascript:');
    expect((receiver.root.firstChild as HTMLAnchorElement).href).toBe(
      'https://example.com/',
    );
  });
});

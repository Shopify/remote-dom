import {SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';
import {NamedNodeMap} from '../NamedNodeMap.ts';
import {toPropertyIndex} from '../shared.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('NamedNodeMap property access', () => {
  it('preserves the NamedNodeMap and Object prototype chains', () => {
    const attributes = document.createElement('div').attributes;

    expect(attributes).toBeInstanceOf(NamedNodeMap);
    expect(Object.getPrototypeOf(attributes)).toBe(NamedNodeMap.prototype);
    expect(attributes).toBeInstanceOf(Object);
    expect(Object.prototype.isPrototypeOf(attributes)).toBe(true);
  });

  it('exposes attributes by index', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    element.setAttribute('title', 'Target');

    expect(element.attributes[0]).toBe(element.attributes.item(0));
    expect(element.attributes[0]?.name).toBe('id');
    expect(element.attributes[1]).toBe(element.attributes.item(1));
    expect(element.attributes[1]?.name).toBe('title');
    expect(element.attributes[2]).toBeUndefined();
  });

  it('prioritizes indexed attributes over Object prototype properties', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    const inheritedDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      '0',
    );

    Object.defineProperty(Object.prototype, '0', {
      configurable: true,
      value: 'inherited',
    });

    try {
      expect(element.attributes[0]).toBe(element.attributes.item(0));
    } finally {
      if (inheritedDescriptor) {
        Object.defineProperty(Object.prototype, '0', inheritedDescriptor);
      } else {
        delete (Object.prototype as any)[0];
      }
    }
  });

  it('only recognizes canonical ECMAScript array indices', () => {
    expect(toPropertyIndex('0')).toBe(0);
    expect(toPropertyIndex('4294967294')).toBe(4294967294);

    for (const property of [
      '',
      '-1',
      '1.5',
      '01',
      '1e0',
      '4294967295',
      'Infinity',
      'NaN',
    ]) {
      expect(toPropertyIndex(property)).toBeUndefined();
    }
    expect(toPropertyIndex(Symbol.iterator)).toBeUndefined();
  });

  it('keeps indexed access live as attributes change', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    element.setAttribute('title', 'Target');

    element.removeAttribute('id');

    expect(element.attributes[0]?.name).toBe('title');
    expect(element.attributes[1]).toBeUndefined();
  });

  it('exposes attributes by name without shadowing prototype properties', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    element.setAttribute('item', 'attribute named item');
    element.setAttribute('toString', 'attribute named toString');
    element.setAttributeNS(SVG_NAMESPACE, 'namespaced', 'value');

    expect((element.attributes as any).id).toBe(
      element.attributes.getNamedItem('id'),
    );
    expect((element.attributes as any).namespaced).toBe(
      element.attributes.getNamedItemNS(SVG_NAMESPACE, 'namespaced'),
    );
    expect((element.attributes as any).missing).toBeUndefined();
    expect(element.attributes.item).toBe(NamedNodeMap.prototype.item);
    expect(element.attributes.toString).toBe(Object.prototype.toString);
    expect(element.attributes.getNamedItem('item')?.value).toBe(
      'attribute named item',
    );
    expect(element.attributes.getNamedItem('toString')?.value).toBe(
      'attribute named toString',
    );
  });

  it('keeps named access and collection identity live', () => {
    const element = document.createElement('div');
    const attributes = element.attributes;

    expect(element.attributes).toBe(attributes);
    expect((attributes as any).status).toBeUndefined();

    element.setAttribute('status', 'ready');
    expect((attributes as any).status).toBe(attributes.getNamedItem('status'));

    element.removeAttribute('status');
    expect((attributes as any).status).toBeUndefined();
  });

  it('prioritizes inherited properties over named attributes', () => {
    const element = document.createElement('div');
    const property = 'namedNodeMapInheritedProperty';
    element.setAttribute(property, 'attribute');

    Object.defineProperty(Object.prototype, property, {
      configurable: true,
      value: undefined,
    });

    try {
      expect((element.attributes as any)[property]).toBeUndefined();
    } finally {
      delete (Object.prototype as any)[property];
    }

    expect((element.attributes as any)[property]).toBe(
      element.attributes.getNamedItem(property),
    );
  });

  it('supports changing an attribute through an indexed Attr', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');

    element.attributes[0]!.value = 'after';

    expect(element.getAttribute('id')).toBe('after');
  });
});

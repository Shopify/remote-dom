import {SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';
import {NamedNodeMap} from '../NamedNodeMap.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('NamedNodeMap property access', () => {
  it('returns a proxy that preserves the NamedNodeMap prototype', () => {
    const attributes = document.createElement('div').attributes;

    expect(attributes).toBeInstanceOf(NamedNodeMap);
    expect(Object.getPrototypeOf(attributes)).toBe(NamedNodeMap.prototype);
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
    element.setAttributeNS(SVG_NAMESPACE, 'namespaced', 'value');

    expect((element.attributes as any).id).toBe(
      element.attributes.getNamedItem('id'),
    );
    expect((element.attributes as any).namespaced).toBe(
      element.attributes.getNamedItemNS(SVG_NAMESPACE, 'namespaced'),
    );
    expect((element.attributes as any).missing).toBeUndefined();
    expect(element.attributes.item).toBe(NamedNodeMap.prototype.item);
    expect(element.attributes.getNamedItem('item')?.value).toBe(
      'attribute named item',
    );
  });

  it('supports changing an attribute through an indexed Attr', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');

    element.attributes[0]!.value = 'after';

    expect(element.getAttribute('id')).toBe('after');
  });
});

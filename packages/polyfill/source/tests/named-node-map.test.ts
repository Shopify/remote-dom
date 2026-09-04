import {HOOKS, SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';
import {NamedNodeMap} from '../NamedNodeMap.ts';
import {toPropertyIndex} from '../shared.ts';

import {beforeEach, describe, expect, it, vi} from 'vitest';

let window: Window;

beforeEach(() => {
  window = new Window();
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

  it('removes namespaced attributes by qualified name and detaches them', () => {
    const element = document.createElement('div');
    element.setAttributeNS(SVG_NAMESPACE, 'mode', 'visible');
    const attr = element.attributes[0]!;

    expect(element.attributes.removeNamedItem('mode')).toBe(attr);
    expect(attr.ownerElement).toBeNull();
    expect(attr.nextSibling).toBeNull();
    expect((element.attributes as any).mode).toBeUndefined();
  });

  it('detaches replaced attributes without disrupting the list', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'first');
    element.setAttribute('title', 'title');
    const attributes = element.attributes;
    const old = attributes[0]!;

    element.setAttribute('id', 'second');

    expect(old.ownerElement).toBeNull();
    expect(old.nextSibling).toBeNull();
    expect(attributes[0]?.value).toBe('second');
    expect(attributes[1]?.name).toBe('title');

    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;
    old.value = 'detached';
    expect(setAttribute).not.toHaveBeenCalled();

    const current = attributes[0]!;
    expect(attributes.setNamedItem(current)).toBe(current);
    expect(attributes.length).toBe(2);
    expect(attributes[1]?.name).toBe('title');
  });

  it('rejects attributes owned by another element', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.setAttribute('id', 'first');
    const attr = first.attributes[0]!;

    expect(() => second.attributes.setNamedItem(attr)).toThrowError(
      'The attribute is already in use by another element.',
    );
    expect(attr.ownerElement).toBe(first);
    expect(first.getAttribute('id')).toBe('first');
    expect(second.getAttribute('id')).toBeNull();
  });

  it('detaches an Attr when adopting it in its current document', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');
    const attr = element.attributes[0]!;
    const removeAttribute = vi.fn();
    window[HOOKS].removeAttribute = removeAttribute;

    expect(document.adoptNode(attr)).toBe(attr);

    expect(attr.ownerElement).toBeNull();
    expect(attr.ownerDocument).toBe(document);
    expect(attr.nextSibling).toBeNull();
    expect(element.attributes.length).toBe(0);
    expect(element.getAttribute('id')).toBeNull();
    expect(removeAttribute).toHaveBeenCalledWith(element, 'id', null);
  });

  it('detaches and transfers an Attr adopted into another document', () => {
    const firstWindow = new Window();
    const secondWindow = new Window();
    const element = firstWindow.document.createElement('div');
    element.setAttributeNS(SVG_NAMESPACE, 'mode', 'before');
    const attr = element.attributes[0]!;
    const firstRemoveAttribute = vi.fn();
    const secondRemoveAttribute = vi.fn();
    firstWindow[HOOKS].removeAttribute = firstRemoveAttribute;
    secondWindow[HOOKS].removeAttribute = secondRemoveAttribute;

    expect(secondWindow.document.adoptNode(attr)).toBe(attr);

    expect(attr.ownerElement).toBeNull();
    expect(attr.ownerDocument).toBe(secondWindow.document);
    expect(attr.nextSibling).toBeNull();
    expect(element.attributes.length).toBe(0);
    expect(element.getAttributeNS(SVG_NAMESPACE, 'mode')).toBeNull();
    expect(firstRemoveAttribute).toHaveBeenCalledWith(
      element,
      'mode',
      SVG_NAMESPACE,
    );
    expect(secondRemoveAttribute).not.toHaveBeenCalled();

    const target = secondWindow.document.createElement('div');
    expect(target.attributes.setNamedItemNS(attr)).toBeNull();
    expect(attr.ownerElement).toBe(target);
    expect(attr.ownerDocument).toBe(secondWindow.document);
    expect(target.getAttributeNS(SVG_NAMESPACE, 'mode')).toBe('before');
  });

  it('updates attribute ownership when adopting an element', () => {
    const firstWindow = new Window();
    const secondWindow = new Window();
    const element = firstWindow.document.createElement('div');
    element.setAttribute('id', 'before');
    firstWindow.document.body.appendChild(element);
    const attr = element.attributes[0]!;
    const firstSetAttribute = vi.fn();
    const secondSetAttribute = vi.fn();
    firstWindow[HOOKS].setAttribute = firstSetAttribute;
    secondWindow[HOOKS].setAttribute = secondSetAttribute;

    secondWindow.document.adoptNode(element);
    attr.value = 'after';

    expect(element.ownerDocument).toBe(secondWindow.document);
    expect(attr.ownerDocument).toBe(secondWindow.document);
    expect(firstSetAttribute).not.toHaveBeenCalled();
    expect(secondSetAttribute).toHaveBeenCalledWith(
      element,
      'id',
      'after',
      null,
    );
  });

  it('updates attribute ownership when inserting across documents', () => {
    const firstWindow = new Window();
    const secondWindow = new Window();
    const element = firstWindow.document.createElement('section');
    const child = firstWindow.document.createElement('div');
    child.setAttribute('id', 'child');
    element.appendChild(child);
    const attr = child.attributes[0]!;

    secondWindow.document.body.appendChild(element);

    expect(element.ownerDocument).toBe(secondWindow.document);
    expect(child.ownerDocument).toBe(secondWindow.document);
    expect(attr.ownerDocument).toBe(secondWindow.document);
  });

  it('supports changing an attribute through an indexed Attr', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;

    element.attributes[0]!.value = 'after';

    expect(element.getAttribute('id')).toBe('after');
    expect(setAttribute).toHaveBeenCalledWith(element, 'id', 'after', null);
  });

  it('does not update an element through a detached Attr', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');
    const attr = element.attributes[0]!;
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;

    element.removeAttribute('id');
    attr.value = 'ghost';

    expect(attr.ownerElement).toBeNull();
    expect(attr.ownerDocument).toBe(document);
    expect(element.getAttribute('id')).toBeNull();
    expect(setAttribute).not.toHaveBeenCalled();
  });
});

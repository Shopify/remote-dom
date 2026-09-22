import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Attr} from '../Attr.ts';
import {HOOKS, NEXT} from '../constants.ts';
import {Window} from '../index.ts';
import {NamedNodeMap} from '../NamedNodeMap.ts';
import {toPropertyIndex} from '../shared.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

function createAttributeList() {
  const element = document.createElement('div');
  const attributes = [
    new Attr('first', 'one'),
    new Attr('second', 'two'),
    new Attr('third', 'three'),
  ];

  for (const attribute of attributes) {
    element.attributes.setNamedItem(attribute);
  }

  return {element, attributes};
}

describe('NamedNodeMap invariants', () => {
  it.each([
    {position: 'head', index: 0},
    {position: 'middle', index: 1},
    {position: 'tail', index: 2},
  ])(
    'preserves the full list when reinstalling its $position attribute',
    ({index}) => {
      const {element, attributes} = createAttributeList();
      const attribute = attributes[index]!;

      expect(element.attributes.setNamedItem(attribute)).toBe(attribute);
      expect([...element.attributes]).toEqual(attributes);
      expect(element.getAttributeNames()).toEqual(['first', 'second', 'third']);
      expect(element.attributes.length).toBe(3);
    },
  );

  it('detaches a replaced attribute without changing its list position', () => {
    const {element, attributes} = createAttributeList();
    const oldAttribute = attributes[1]!;
    const replacement = new Attr('second', 'replacement');

    expect(element.attributes.setNamedItem(replacement)).toBe(oldAttribute);
    expect([...element.attributes]).toEqual([
      attributes[0],
      replacement,
      attributes[2],
    ]);
    expect(oldAttribute.ownerElement).toBeNull();
    expect(oldAttribute[NEXT]).toBeNull();

    oldAttribute.value = 'detached';
    expect(element.getAttribute('second')).toBe('replacement');
  });

  it.each([
    {position: 'head', index: 0},
    {position: 'middle', index: 1},
    {position: 'tail', index: 2},
  ])('detaches a removed $position attribute', ({index}) => {
    const {element, attributes} = createAttributeList();
    const attribute = attributes[index]!;

    expect(element.attributes.removeNamedItem(attribute.name)).toBe(attribute);
    expect([...element.attributes]).toEqual(
      attributes.filter((candidate) => candidate !== attribute),
    );
    expect(attribute.ownerElement).toBeNull();
    expect(attribute[NEXT]).toBeNull();
  });

  it('replaces Attr nodes by expanded name through setNamedItemNS', () => {
    const element = document.createElement('div');
    const original = new Attr('first:state', 'initial', 'urn:state');
    const replacement = new Attr('second:state', 'updated', 'urn:state');
    element.attributes.setNamedItemNS(original);

    expect(element.attributes.setNamedItemNS(replacement)).toBe(original);
    expect(element.attributes.length).toBe(1);
    expect(element.attributes.item(0)).toBe(replacement);
    expect(replacement.name).toBe('second:state');
    expect(original.ownerElement).toBeNull();
  });

  it('rejects cross-element aliases but allows reuse after removal', () => {
    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    const attribute = new Attr('shared', 'value');
    const secondAttribute = new Attr('second', 'untouched');
    firstElement.attributes.setNamedItem(attribute);
    secondElement.attributes.setNamedItem(secondAttribute);

    let thrown: unknown;
    try {
      secondElement.attributes.setNamedItem(attribute);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({name: 'InUseAttributeError'});
    expect([...firstElement.attributes]).toEqual([attribute]);
    expect([...secondElement.attributes]).toEqual([secondAttribute]);
    expect(attribute.ownerElement).toBe(firstElement);

    expect(firstElement.attributes.removeNamedItem('shared')).toBe(attribute);
    expect(secondElement.attributes.setNamedItem(attribute)).toBeNull();
    expect([...firstElement.attributes]).toEqual([]);
    expect([...secondElement.attributes]).toEqual([secondAttribute, attribute]);
    expect(attribute.ownerElement).toBe(secondElement);
  });
});

describe('NamedNodeMap property access', () => {
  it('preserves the NamedNodeMap and Object prototype chains', () => {
    const attributes = document.createElement('div').attributes;

    expect(attributes).toBeInstanceOf(NamedNodeMap);
    expect(Object.getPrototypeOf(attributes)).toBe(NamedNodeMap.prototype);
    expect(attributes).toBeInstanceOf(Object);
    expect(Object.prototype.isPrototypeOf(attributes)).toBe(true);
  });

  it('exposes live attributes by index', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    element.setAttribute('title', 'Target');

    expect(element.attributes[0]).toBe(element.attributes.item(0));
    expect(element.attributes[1]).toBe(element.attributes.item(1));
    expect(element.attributes[2]).toBeUndefined();

    element.removeAttribute('id');

    expect(element.attributes[0]?.name).toBe('title');
    expect(element.attributes[1]).toBeUndefined();
  });

  it('prioritizes indexed attributes over numeric Object prototype properties', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    const inheritedDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      '0',
    );

    Object.defineProperty(Object.prototype, '0', {
      configurable: true,
      value: 'inherited',
      writable: true,
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
      '-Infinity',
      'NaN',
    ]) {
      expect(toPropertyIndex(property)).toBeUndefined();
    }
    expect(toPropertyIndex(Symbol.iterator)).toBeUndefined();
  });

  it.each(['01', '1e0', '-1', '1.5', '4294967295'])(
    'delegates rejected numeric-looking property %s to its original name',
    (property) => {
      const attributes = document.createElement('div').attributes;
      const item = vi.spyOn(attributes, 'item');
      const getNamedItem = vi.spyOn(attributes, 'getNamedItem');

      expect((attributes as any)[property]).toBeUndefined();
      expect(item).not.toHaveBeenCalled();
      expect(getNamedItem).toHaveBeenCalledOnce();
      expect(getNamedItem).toHaveBeenCalledWith(property);
    },
  );

  it('lets own expandos mask indexed and named attributes until deleted', () => {
    const element = document.createElement('div');
    element.setAttribute('status', 'ready');
    const attributes = element.attributes;
    const attribute = attributes.item(0)!;

    Object.defineProperties(attributes, {
      0: {configurable: true, value: 'numeric expando'},
      status: {configurable: true, value: 'named expando'},
    });

    expect((attributes as any)[0]).toBe('numeric expando');
    expect((attributes as any).status).toBe('named expando');

    delete (attributes as any)[0];
    delete (attributes as any).status;

    expect(attributes[0]).toBe(attribute);
    expect((attributes as any).status).toBe(attribute);
  });

  it('exposes attributes by qualified name without shadowing prototypes', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'target');
    element.setAttribute('item', 'attribute named item');
    element.setAttribute('toString', 'attribute named toString');
    element.setAttributeNS('urn:state', 'state:mode', 'ready');

    expect((element.attributes as any).id).toBe(
      element.attributes.getNamedItem('id'),
    );
    expect((element.attributes as any)['state:mode']).toBe(
      element.attributes.getNamedItem('state:mode'),
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

  it('routes mutation through an indexed Attr to its owning element hook', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'before');
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;

    element.attributes[0]!.value = 'after';

    expect(element.getAttribute('id')).toBe('after');
    expect(setAttribute).toHaveBeenCalledWith(element, 'id', 'after', null);
  });

  it('routes reattached indexed Attr mutation only to the destination hook', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const source = sourceWindow.document.createElement('div');
    const destination = destinationWindow.document.createElement('div');
    source.setAttributeNS('urn:state', 'state:mode', 'before');
    const attribute = source.attributes.removeNamedItemNS('urn:state', 'mode');

    expect(attribute).not.toBeNull();
    destination.attributes.setNamedItemNS(attribute!);

    const sourceSetAttribute = vi.fn();
    const destinationSetAttribute = vi.fn();
    sourceWindow[HOOKS].setAttribute = sourceSetAttribute;
    destinationWindow[HOOKS].setAttribute = destinationSetAttribute;

    destination.attributes[0]!.value = 'after';

    expect(sourceSetAttribute).not.toHaveBeenCalled();
    expect(destinationSetAttribute).toHaveBeenCalledWith(
      destination,
      'state:mode',
      'after',
      'urn:state',
    );
  });
});

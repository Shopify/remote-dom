import {beforeEach, describe, expect, it} from 'vitest';

import {Attr} from '../Attr.ts';
import {NEXT} from '../constants.ts';
import {Window} from '../index.ts';

let document: Window['document'];

beforeEach(() => {
  const window = new Window();
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

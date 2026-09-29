import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Attr} from '../Attr.ts';
import {HOOKS} from '../constants.ts';
import {Window} from '../index.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

describe('Attr value mutations', () => {
  it.each(['value', 'nodeValue'] as const)(
    'updates an attached attribute through %s and dispatches its hook',
    (property) => {
      const setAttribute = vi.fn(
        (element: Element, name: string, value: string) => {
          expect(element.getAttribute(name)).toBe(value);
        },
      );
      window[HOOKS].setAttribute = setAttribute;
      const element = document.createElement('div');
      const attribute = new Attr('data-state', 'initial');
      element.attributes.setNamedItem(attribute);
      setAttribute.mockClear();

      expect(() => {
        attribute[property] = 'updated';
      }).not.toThrow();

      expect(attribute.value).toBe('updated');
      expect(attribute.nodeValue).toBe('updated');
      expect(attribute.ownerDocument).toBe(document);
      expect(element.getAttribute('data-state')).toBe('updated');
      expect(setAttribute).toHaveBeenCalledOnce();
      expect(setAttribute).toHaveBeenCalledWith(
        element,
        'data-state',
        'updated',
        null,
      );
    },
  );

  it('updates a detached attribute without dispatching a hook', () => {
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;
    const attribute = new Attr('data-state', 'initial');

    expect(() => {
      attribute.value = 'detached';
    }).not.toThrow();

    expect(attribute.value).toBe('detached');
    expect(setAttribute).not.toHaveBeenCalled();
  });

  it('updates a removed attribute without changing its former element', () => {
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;
    const element = document.createElement('div');
    const attribute = new Attr('data-state', 'initial');
    element.attributes.setNamedItem(attribute);
    element.attributes.removeNamedItem('data-state');
    setAttribute.mockClear();

    expect(() => {
      attribute.value = 'removed';
    }).not.toThrow();

    expect(attribute.value).toBe('removed');
    expect(attribute.ownerDocument).toBe(document);
    expect(element.getAttribute('data-state')).toBeNull();
    expect(setAttribute).not.toHaveBeenCalled();
  });

  it('dispatches through the new document after reattachment', () => {
    const firstSetAttribute = vi.fn();
    window[HOOKS].setAttribute = firstSetAttribute;
    const firstElement = document.createElement('div');
    const attribute = new Attr('data-state', 'initial');
    firstElement.attributes.setNamedItem(attribute);
    firstElement.attributes.removeNamedItem('data-state');

    const secondWindow = new Window();
    const secondSetAttribute = vi.fn();
    secondWindow[HOOKS].setAttribute = secondSetAttribute;
    const secondElement = secondWindow.document.createElement('div');
    secondElement.attributes.setNamedItem(attribute);
    firstSetAttribute.mockClear();
    secondSetAttribute.mockClear();

    expect(() => {
      attribute.nodeValue = 'reattached';
    }).not.toThrow();

    expect(attribute.ownerElement).toBe(secondElement);
    expect(attribute.ownerDocument).toBe(secondWindow.document);
    expect(secondElement.getAttribute('data-state')).toBe('reattached');
    expect(firstSetAttribute).not.toHaveBeenCalled();
    expect(secondSetAttribute).toHaveBeenCalledWith(
      secondElement,
      'data-state',
      'reattached',
      null,
    );
  });
});

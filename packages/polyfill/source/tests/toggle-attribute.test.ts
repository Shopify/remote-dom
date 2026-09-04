import {beforeEach, describe, expect, it} from 'vitest';

import {HOOKS} from '../constants.ts';
import {Window} from '../index.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

describe('Element.toggleAttribute()', () => {
  it('toggles an ASCII-normalized HTML attribute through hooks and reactions', () => {
    const events: string[] = [];

    class CustomElement extends window.HTMLElement {
      static observedAttributes = ['align'];

      attributeChangedCallback(
        name: string,
        oldValue: string | null,
        newValue: string | null,
        namespace: string | null,
      ) {
        events.push(`callback:${name}:${oldValue}:${newValue}:${namespace}`);
      }
    }

    window.customElements.define(
      'toggle-example',
      CustomElement as unknown as CustomElementConstructor,
    );
    window[HOOKS].setAttribute = (_element, name, value, namespace) => {
      events.push(`hook:set:${name}:${value}:${namespace}`);
    };
    window[HOOKS].removeAttribute = (_element, name, namespace) => {
      events.push(`hook:remove:${name}:${namespace}`);
    };
    const element = document.createElement('toggle-example');

    expect(element.toggleAttribute('ALIGN')).toBe(true);
    expect(element.getAttributeNames()).toEqual(['align']);
    expect(element.getAttributeNS(null, 'ALIGN')).toBeNull();
    expect(element.getAttributeNS(null, 'align')).toBe('');
    expect(element.toggleAttribute('Align')).toBe(false);
    expect(element.hasAttribute('align')).toBe(false);
    expect(events).toEqual([
      'hook:set:align::null',
      'callback:align:null::null',
      'hook:remove:align:null',
      'callback:align::null:null',
    ]);
  });

  it('honors force without mutating an already-correct state', () => {
    const element = document.createElement('div');

    expect(element.toggleAttribute('state', false)).toBe(false);
    expect(element.hasAttribute('state')).toBe(false);
    expect(element.toggleAttribute('state', true)).toBe(true);
    expect(element.toggleAttribute('state', true)).toBe(true);
    expect(element.getAttributeNames()).toEqual(['state']);
    expect(element.toggleAttribute('state', null as any)).toBe(false);
    expect(element.toggleAttribute('state', undefined)).toBe(true);
    expect(element.toggleAttribute('state', 0 as any)).toBe(false);
    expect(element.toggleAttribute('state', 1 as any)).toBe(true);
  });

  it('removes the first attribute with the normalized qualified name', () => {
    const element = document.createElement('div');
    element.setAttributeNS('first', 'state', 'first');
    element.setAttributeNS('second', 'state', 'second');

    expect(element.toggleAttribute('STATE')).toBe(false);
    expect(element.getAttributeNS('first', 'state')).toBeNull();
    expect(element.getAttributeNS('second', 'state')).toBe('second');
  });

  it.each(['5', '{', ':', 'emoji-💡'])(
    'accepts the current attribute Name production case %j',
    (name) => {
      const element = document.createElement('div');

      expect(element.toggleAttribute(name)).toBe(true);
      expect(element.hasAttribute(name)).toBe(true);
      element.setAttribute(name, 'value');
      expect(element.getAttribute(name)).toBe('value');
    },
  );

  it.each(['', 'a=b', 'a b', 'a/b', 'a>b', 'a\0b'])(
    'rejects the invalid attribute name %j',
    (name) => {
      const element = document.createElement('div');

      expect(() => element.toggleAttribute(name)).toThrowError(
        expect.objectContaining({name: 'InvalidCharacterError'}),
      );
      expect(() => element.setAttribute(name, 'value')).toThrowError(
        expect.objectContaining({name: 'InvalidCharacterError'}),
      );
    },
  );
});

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

let polyfillWindow: Window;
let polyfillDocument: Window['document'];

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
  polyfillDocument = polyfillWindow.document;
});

describe('slot attribute reflection', () => {
  it.each([
    {description: 'empty', slot: ''},
    {description: 'non-empty', slot: 'aside'},
  ])(
    'removes an $description slot attribute without recreating it',
    ({slot}) => {
      const setAttribute = vi.fn();
      const removeAttribute = vi.fn((element: Element, name: string) => {
        if (name === 'slot') {
          expect(element.hasAttribute(name)).toBe(false);
          expect(element.slot).toBe('');
        }
      });
      polyfillWindow[HOOKS].setAttribute = setAttribute;
      polyfillWindow[HOOKS].removeAttribute = removeAttribute;
      const element = polyfillDocument.createElement('div');

      element.setAttribute('slot', slot);
      const removedAttribute = element.attributes.getNamedItem('slot');
      setAttribute.mockClear();

      element.removeAttribute('slot');

      expect(removeAttribute).toHaveBeenCalledOnce();
      expect(removeAttribute).toHaveBeenCalledWith(element, 'slot', null);
      expect(setAttribute).not.toHaveBeenCalled();
      expect(removedAttribute?.ownerElement).toBeNull();
      expect(element.hasAttribute('slot')).toBe(false);
      expect(element.getAttribute('slot')).toBeNull();
      expect(element.slot).toBe('');
      expect(element.hasAttribute('slot')).toBe(false);
    },
  );

  it('treats repeated slot attribute removal as a no-op', () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    polyfillWindow[HOOKS].setAttribute = setAttribute;
    polyfillWindow[HOOKS].removeAttribute = removeAttribute;
    const element = polyfillDocument.createElement('div');
    element.setAttribute('slot', 'aside');
    setAttribute.mockClear();

    element.removeAttribute('slot');
    element.removeAttribute('slot');

    expect(removeAttribute).toHaveBeenCalledOnce();
    expect(setAttribute).not.toHaveBeenCalled();
    expect(element.hasAttribute('slot')).toBe(false);
    expect(element.slot).toBe('');
  });

  it('reflects property-driven slot updates through the attribute', () => {
    const values: string[] = [];
    polyfillWindow[HOOKS].setAttribute = (_element, name, value) => {
      if (name === 'slot') values.push(value);
    };
    const element = polyfillDocument.createElement('div');

    element.slot = 'aside';
    element.slot = 'header';
    element.slot = 'header';
    element.slot = '';

    expect(values).toEqual(['aside', 'header', '']);
    expect(element.slot).toBe('');
    expect(element.hasAttribute('slot')).toBe(true);
    expect(element.getAttribute('slot')).toBe('');

    element.removeAttribute('slot');

    expect(values).toEqual(['aside', 'header', '']);
    expect(element.slot).toBe('');
    expect(element.hasAttribute('slot')).toBe(false);
  });

  it('emits removal before a slot callback restores the attribute', () => {
    const events: string[] = [];

    class RestoringSlotElement extends PolyfillHTMLElement {
      static observedAttributes = ['slot'];

      attributeChangedCallback(
        _name: string,
        _oldValue: string | null,
        newValue: string | null,
      ) {
        events.push(`callback:${newValue}`);
        if (newValue == null) this.slot = 'restored';
      }
    }

    polyfillWindow.customElements.define(
      'restoring-slot',
      RestoringSlotElement as unknown as CustomElementConstructor,
    );
    const element = polyfillDocument.createElement('restoring-slot');
    element.setAttribute('slot', 'initial');
    events.length = 0;

    polyfillWindow[HOOKS].removeAttribute = (_element, name) => {
      if (name === 'slot') events.push('hook:remove');
    };
    polyfillWindow[HOOKS].setAttribute = (_element, name, value) => {
      if (name === 'slot') events.push(`hook:set:${value}`);
    };

    element.removeAttribute('slot');

    expect(events).toEqual([
      'hook:remove',
      'callback:null',
      'hook:set:restored',
      'callback:restored',
    ]);
    expect(element.getAttribute('slot')).toBe('restored');
    expect(element.slot).toBe('restored');
  });
});

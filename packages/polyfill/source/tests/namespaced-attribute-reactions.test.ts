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

describe('namespaced attribute mutations', () => {
  it('updates an existing expanded name in place and preserves its prefix', () => {
    const events: string[] = [];

    class CustomElement extends window.HTMLElement {
      static observedAttributes = ['state'];

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
      'namespaced-attribute',
      CustomElement as unknown as CustomElementConstructor,
    );
    window[HOOKS].setAttribute = (_element, name, value, namespace) => {
      events.push(`hook:${name}:${value}:${namespace}`);
    };
    const element = document.createElement('namespaced-attribute');
    element.setAttributeNS('urn:state', 'first:state', 'initial');
    const attribute = element.attributes.item(0)!;
    events.length = 0;

    element.setAttributeNS('urn:state', 'second:state', 'updated');

    expect(element.attributes.item(0)).toBe(attribute);
    expect(attribute.ownerElement).toBe(element);
    expect(attribute.name).toBe('first:state');
    expect(attribute.prefix).toBe('first');
    expect(attribute.localName).toBe('state');
    expect(attribute.value).toBe('updated');
    expect(events).toEqual([
      'hook:first:state:updated:urn:state',
      'callback:state:initial:updated:urn:state',
    ]);

    events.length = 0;
    element.setAttributeNS('urn:state', 'third:state', 'updated');
    expect(events).toEqual([
      'hook:first:state:updated:urn:state',
      'callback:state:updated:updated:urn:state',
    ]);
  });

  it.each(['value', 'nodeValue'] as const)(
    'routes attached Attr.%s updates through hooks before reactions',
    (property) => {
      const events: string[] = [];

      class CustomElement extends window.HTMLElement {
        static observedAttributes = ['state'];

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
        `attr-${property.toLowerCase()}`,
        CustomElement as unknown as CustomElementConstructor,
      );
      window[HOOKS].setAttribute = (_element, name, value, namespace) => {
        events.push(`hook:${name}:${value}:${namespace}`);
      };
      const element = document.createElement(`attr-${property.toLowerCase()}`);
      element.setAttributeNS('urn:state', 'prefix:state', 'initial');
      const attribute = element.attributes.item(0)!;
      events.length = 0;

      attribute[property] = 'direct';

      expect(events).toEqual([
        'hook:prefix:state:direct:urn:state',
        'callback:state:initial:direct:urn:state',
      ]);
      expect(element.getAttributeNS('urn:state', 'state')).toBe('direct');
    },
  );

  it('passes the local name and namespace to removal reactions', () => {
    const callbacks: unknown[][] = [];

    class CustomElement extends window.HTMLElement {
      static observedAttributes = ['state'];

      attributeChangedCallback(...args: unknown[]) {
        callbacks.push(args);
      }
    }

    window.customElements.define(
      'remove-namespaced-attribute',
      CustomElement as unknown as CustomElementConstructor,
    );
    const element = document.createElement('remove-namespaced-attribute');
    element.setAttributeNS('urn:state', 'prefix:state', 'initial');
    callbacks.length = 0;

    element.removeAttributeNS('urn:state', 'state');

    expect(callbacks).toEqual([['state', 'initial', null, 'urn:state']]);
  });

  it('validates qualified attribute names and normalizes empty namespaces', () => {
    const element = document.createElement('div');

    element.setAttributeNS('', 'state', 'value');
    expect(element.attributes.item(0)?.namespaceURI).toBeNull();
    expect(() =>
      element.setAttributeNS(null, 'prefix:state', 'value'),
    ).toThrowError(expect.objectContaining({name: 'NamespaceError'}));
    expect(() =>
      element.setAttributeNS('urn:state', 'prefix:', 'value'),
    ).toThrowError(expect.objectContaining({name: 'InvalidCharacterError'}));
  });
});

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Attr} from '../Attr.ts';
import {HOOKS, HTML_NAMESPACE, SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

describe('DOM name and namespace normalization', () => {
  it('uses the standard node names for non-element nodes', () => {
    expect(document.nodeName).toBe('#document');
    expect(document.createDocumentFragment().nodeName).toBe(
      '#document-fragment',
    );
    expect(document.createTextNode('text').nodeName).toBe('#text');
    expect(document.createComment('comment').nodeName).toBe('#comment');
    expect(new Attr('data-state', 'ready').nodeName).toBe('data-state');
  });

  it('normalizes HTML element names while preserving SVG element names', () => {
    const htmlElement = document.createElement('linearGradient');
    const svgElement = document.createElementNS(
      SVG_NAMESPACE,
      'linearGradient',
    );

    expect(htmlElement.localName).toBe('lineargradient');
    expect(htmlElement.nodeName).toBe('LINEARGRADIENT');
    expect(htmlElement.tagName).toBe('LINEARGRADIENT');
    expect(htmlElement.namespaceURI).toBe(HTML_NAMESPACE);

    expect(svgElement.localName).toBe('linearGradient');
    expect(svgElement.nodeName).toBe('linearGradient');
    expect(svgElement.tagName).toBe('linearGradient');
    expect(svgElement.namespaceURI).toBe(SVG_NAMESPACE);
  });

  it('uses normalized createElement names for custom-element lookup and storage', () => {
    class CustomElement extends window.HTMLElement {}

    window.customElements.define(
      'x-example',
      CustomElement as unknown as CustomElementConstructor,
    );

    const htmlElement = document.createElement('X-EXAMPLE');
    const lowerNamespacedElement = document.createElementNS(
      HTML_NAMESPACE,
      'x-example',
    );
    const upperNamespacedElement = document.createElementNS(
      HTML_NAMESPACE,
      'X-EXAMPLE',
    );

    expect(htmlElement).toBeInstanceOf(CustomElement);
    expect(htmlElement.localName).toBe('x-example');
    expect(htmlElement.nodeName).toBe('X-EXAMPLE');

    expect(lowerNamespacedElement).toBeInstanceOf(CustomElement);
    expect(lowerNamespacedElement.localName).toBe('x-example');

    expect(upperNamespacedElement).not.toBeInstanceOf(CustomElement);
    expect(upperNamespacedElement.localName).toBe('X-EXAMPLE');
  });

  it('folds HTML attribute names for storage, lookup, hooks, and reactions', () => {
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    const attributeChangedCallback = vi.fn();

    class CustomElement extends window.HTMLElement {
      static observedAttributes = ['data-state'];

      attributeChangedCallback(
        name: string,
        oldValue: string | null,
        newValue: string | null,
        namespace: string | null,
      ) {
        attributeChangedCallback(name, oldValue, newValue, namespace);
      }
    }

    window.customElements.define(
      'attribute-example',
      CustomElement as unknown as CustomElementConstructor,
    );
    window[HOOKS].setAttribute = setAttribute;
    window[HOOKS].removeAttribute = removeAttribute;

    const element = document.createElement('ATTRIBUTE-EXAMPLE');
    element.setAttribute('DATA-STATE', 'ready');
    const attribute = element.attributes.item(0)!;

    expect(attribute.name).toBe('data-state');
    expect(attribute.localName).toBe('data-state');
    expect(element.getAttributeNames()).toEqual(['data-state']);
    expect(element.getAttribute('DATA-STATE')).toBe('ready');
    expect(element.hasAttribute('Data-State')).toBe(true);
    expect(element.attributes.getNamedItem('DATA-STATE')).toBe(attribute);
    expect(setAttribute).toHaveBeenCalledWith(
      element,
      'data-state',
      'ready',
      null,
    );
    expect(attributeChangedCallback).toHaveBeenCalledWith(
      'data-state',
      null,
      'ready',
      null,
    );

    element.removeAttribute('DATA-STATE');

    expect(element.hasAttribute('data-state')).toBe(false);
    expect(removeAttribute).toHaveBeenCalledWith(element, 'data-state', null);
    expect(attributeChangedCallback).toHaveBeenLastCalledWith(
      'data-state',
      'ready',
      null,
      null,
    );
  });

  it('preserves unnamespaced SVG attribute casing', () => {
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;
    const element = document.createElementNS(SVG_NAMESPACE, 'svg');

    element.setAttribute('viewBox', '0 0 10 10');

    expect(element.getAttributeNames()).toEqual(['viewBox']);
    expect(element.getAttribute('viewBox')).toBe('0 0 10 10');
    expect(element.getAttribute('viewbox')).toBeNull();
    expect(element.attributes.getNamedItem('viewBox')?.name).toBe('viewBox');
    expect(setAttribute).toHaveBeenCalledWith(
      element,
      'viewBox',
      '0 0 10 10',
      null,
    );
  });

  it('does not fold names passed to the namespace-aware attribute APIs', () => {
    const setAttribute = vi.fn();
    window[HOOKS].setAttribute = setAttribute;
    const element = document.createElement('div');

    element.setAttributeNS(SVG_NAMESPACE, 'svg:ViewBox', 'value');
    const attribute = element.attributes.item(0)!;

    expect(attribute.name).toBe('svg:ViewBox');
    expect(attribute.localName).toBe('ViewBox');
    expect(attribute.prefix).toBe('svg');
    expect(element.getAttributeNS(SVG_NAMESPACE, 'ViewBox')).toBe('value');
    expect(element.getAttributeNS(SVG_NAMESPACE, 'viewbox')).toBeNull();
    expect(setAttribute).toHaveBeenCalledWith(
      element,
      'svg:ViewBox',
      'value',
      SVG_NAMESPACE,
    );
  });

  it('matches namespaced attributes by namespace and local name', () => {
    const removeAttribute = vi.fn();
    window[HOOKS].removeAttribute = removeAttribute;
    const element = document.createElementNS(SVG_NAMESPACE, 'svg');

    element.setAttributeNS(HTML_NAMESPACE, 'first:state', 'initial');
    const attribute = element.attributes.item(0)!;
    element.setAttributeNS(HTML_NAMESPACE, 'second:state', 'updated');
    element.setAttributeNS(SVG_NAMESPACE, 'svg:state', 'svg');

    expect(element.attributes.length).toBe(2);
    expect(attribute.ownerElement).toBe(element);
    expect(attribute.name).toBe('first:state');
    expect(element.getAttribute('first:state')).toBe('updated');
    expect(element.getAttribute('second:state')).toBeNull();
    expect(element.getAttributeNS(HTML_NAMESPACE, 'state')).toBe('updated');
    expect(element.getAttributeNS(SVG_NAMESPACE, 'state')).toBe('svg');
    expect(
      element.attributes.getNamedItemNS(HTML_NAMESPACE, 'state')?.name,
    ).toBe('first:state');

    element.removeAttributeNS(HTML_NAMESPACE, 'state');

    expect(element.getAttributeNS(HTML_NAMESPACE, 'state')).toBeNull();
    expect(element.getAttributeNS(SVG_NAMESPACE, 'state')).toBe('svg');
    expect(removeAttribute).toHaveBeenCalledWith(
      element,
      'first:state',
      HTML_NAMESPACE,
    );
  });

  it('keeps foreign attributes out of null-namespace consumers', () => {
    const element = document.createElement('div');
    element.setAttributeNS('urn:foreign', 'id', 'ghost');
    element.setAttributeNS('urn:foreign', 'class', 'foreign');
    element.setAttributeNS('urn:foreign', 'slot', 'aside');
    element.setAttributeNS('urn:foreign', 'data-flag', 'present');
    document.body.appendChild(element);

    expect(element.getAttribute('id')).toBe('ghost');
    expect(element.id).toBe('');
    expect(element.slot).toBe('');
    expect(document.getElementById('ghost')).toBeNull();
    expect(document.querySelector('#ghost')).toBeNull();
    expect(document.querySelector('.foreign')).toBeNull();
    expect(document.querySelector('[data-flag]')).toBeNull();
    expect(document.getElementsByClassName('foreign')).toHaveLength(0);
  });

  it('creates and mutates ordinary attributes alongside foreign names', () => {
    const element = document.createElement('div');
    element.setAttributeNS('urn:foreign', 'id', 'ghost');
    element.setAttributeNS('urn:foreign', 'slot', 'aside');
    element.setAttributeNS('urn:foreign', 'data-flag', 'foreign');
    document.body.appendChild(element);

    element.id = 'ordinary';
    element.slot = 'aside';
    expect(element.toggleAttribute('DATA-FLAG')).toBe(true);

    expect(element.id).toBe('ordinary');
    expect(element.slot).toBe('aside');
    expect(element.getAttributeNS(null, 'data-flag')).toBe('');
    expect(element.getAttributeNS('urn:foreign', 'id')).toBe('ghost');
    expect(element.getAttributeNS('urn:foreign', 'slot')).toBe('aside');
    expect(element.getAttributeNS('urn:foreign', 'data-flag')).toBe('foreign');
    expect(document.getElementById('ordinary')).toBe(element);
    expect(document.querySelector('#ordinary')).toBe(element);
    expect(document.querySelector('[data-flag]')).toBe(element);

    element.removeAttribute('ID');
    expect(element.id).toBe('');
    expect(element.getAttributeNS('urn:foreign', 'id')).toBe('ghost');

    expect(element.toggleAttribute('DATA-FLAG')).toBe(false);
    expect(element.getAttributeNS(null, 'data-flag')).toBeNull();
    expect(element.getAttributeNS('urn:foreign', 'data-flag')).toBe('foreign');
  });

  it('converts setAttribute values before validating names', () => {
    const element = document.createElement('div');
    const conversionError = new TypeError('conversion failed');
    const conversions: string[] = [];
    let thrown: unknown;

    try {
      element.setAttribute(
        {
          toString() {
            conversions.push('name');
            return 'bad name';
          },
        } as any,
        {
          toString() {
            conversions.push('value');
            throw conversionError;
          },
        } as any,
      );
    } catch (error) {
      thrown = error;
    }

    expect(conversions).toEqual(['name', 'value']);
    expect(thrown).toBe(conversionError);
    expect(element.attributes).toHaveLength(0);
  });

  it('converts setAttributeNS arguments before validating namespaces', () => {
    const element = document.createElement('div');
    const conversionError = new TypeError('conversion failed');
    const conversions: string[] = [];
    let thrown: unknown;

    try {
      element.setAttributeNS(
        {
          toString() {
            conversions.push('namespace');
            return '';
          },
        } as any,
        {
          toString() {
            conversions.push('name');
            return 'prefix:state';
          },
        } as any,
        {
          toString() {
            conversions.push('value');
            throw conversionError;
          },
        } as any,
      );
    } catch (error) {
      thrown = error;
    }

    expect(conversions).toEqual(['namespace', 'name', 'value']);
    expect(thrown).toBe(conversionError);
    expect(element.attributes).toHaveLength(0);
  });
});

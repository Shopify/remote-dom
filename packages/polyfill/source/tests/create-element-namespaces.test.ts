import {beforeEach, describe, expect, it} from 'vitest';

import {
  HTML_NAMESPACE,
  SVG_NAMESPACE,
  XML_NAMESPACE,
  XMLNS_NAMESPACE,
} from '../constants.ts';
import {Window} from '../index.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

describe('Document element namespace handling', () => {
  it('validates and ASCII-normalizes createElement names', () => {
    expect(document.createElement('AÇ').localName).toBe('aÇ');
    expect(document.createElement(null as any).localName).toBe('null');
    expect(() => document.createElement('1element')).toThrowError(
      expect.objectContaining({name: 'InvalidCharacterError'}),
    );
  });

  it('coerces and represents createElementNS arguments', () => {
    const namespace = {toString: () => 'urn:example'};
    const qualifiedName = {toString: () => 'prefix:Local'};
    const element = document.createElementNS(
      namespace as any,
      qualifiedName as any,
    );

    expect(element.namespaceURI).toBe('urn:example');
    expect(element.prefix).toBe('prefix');
    expect(element.localName).toBe('Local');
    expect(element.nodeName).toBe('prefix:Local');
    expect(element.tagName).toBe('prefix:Local');
  });

  it.each([null, '', undefined])(
    'keeps the %s namespace distinct from the HTML namespace',
    (namespace) => {
      const element = document.createElementNS(namespace as any, 'template');

      expect(element.namespaceURI).toBeNull();
      expect(element.prefix).toBeNull();
      expect(element.localName).toBe('template');
      expect(element).not.toBeInstanceOf(window.HTMLTemplateElement);
    },
  );

  it('specializes template, custom, and SVG elements only in their namespaces', () => {
    class CustomElement extends window.HTMLElement {}
    window.customElements.define(
      'x-example',
      CustomElement as unknown as CustomElementConstructor,
    );

    const template = document.createElementNS(HTML_NAMESPACE, 'html:template');
    const custom = document.createElementNS(HTML_NAMESPACE, 'html:x-example');
    const uppercaseCustom = document.createElementNS(
      HTML_NAMESPACE,
      'html:X-EXAMPLE',
    );
    const foreignCustom = document.createElementNS('urn:example', 'x-example');
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    expect(template).toBeInstanceOf(window.HTMLTemplateElement);
    expect(template.prefix).toBe('html');
    expect(template.localName).toBe('template');
    expect(template.tagName).toBe('HTML:TEMPLATE');
    expect(custom).toBeInstanceOf(CustomElement);
    expect(custom.prefix).toBe('html');
    expect(uppercaseCustom).not.toBeInstanceOf(CustomElement);
    expect(foreignCustom).not.toBeInstanceOf(CustomElement);
    expect(svg).toBeInstanceOf(window.SVGElement);
  });

  it.each([
    {
      namespace: 'urn:example',
      name: '1element',
      error: 'InvalidCharacterError',
    },
    {
      namespace: 'urn:example',
      name: ':element',
      error: 'InvalidCharacterError',
    },
    {namespace: 'urn:example', name: 'prefix:', error: 'InvalidCharacterError'},
    {namespace: null, name: 'prefix:element', error: 'NamespaceError'},
    {namespace: 'urn:example', name: 'xml:element', error: 'NamespaceError'},
    {namespace: 'urn:example', name: 'xmlns', error: 'NamespaceError'},
    {namespace: XMLNS_NAMESPACE, name: 'element', error: 'NamespaceError'},
  ])('rejects $name in $namespace with $error', ({namespace, name, error}) => {
    expect(() => document.createElementNS(namespace, name)).toThrowError(
      expect.objectContaining({name: error}),
    );
  });

  it.each([
    {
      namespace: 'urn:example',
      name: '0:element',
      prefix: '0',
      local: 'element',
    },
    {
      namespace: 'urn:example',
      name: 'prefix:element:more',
      prefix: 'prefix',
      local: 'element:more',
    },
    {
      namespace: XML_NAMESPACE,
      name: 'xml:element',
      prefix: 'xml',
      local: 'element',
    },
    {namespace: XMLNS_NAMESPACE, name: 'xmlns', prefix: null, local: 'xmlns'},
    {
      namespace: XMLNS_NAMESPACE,
      name: 'xmlns:element',
      prefix: 'xmlns',
      local: 'element',
    },
  ])(
    'accepts the qualified name $name in its namespace',
    ({namespace, name, prefix, local}) => {
      const element = document.createElementNS(namespace, name);

      expect(element.namespaceURI).toBe(namespace);
      expect(element.prefix).toBe(prefix);
      expect(element.localName).toBe(local);
      expect(element.nodeName).toBe(name);
    },
  );
});

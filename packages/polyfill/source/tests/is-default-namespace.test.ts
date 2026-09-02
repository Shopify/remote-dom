import {beforeEach, describe, expect, it} from 'vitest';

import {Attr} from '../Attr.ts';
import {HTML_NAMESPACE, SVG_NAMESPACE, XMLNS_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';

let document: Window['document'];

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

describe('Node.isDefaultNamespace()', () => {
  it('locates the default namespace for HTML, SVG, documents, and descendants', () => {
    const html = document.createElement('div');
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    const text = document.createTextNode('text');
    svg.appendChild(text);

    expect(document.isDefaultNamespace(HTML_NAMESPACE)).toBe(true);
    expect(html.isDefaultNamespace(HTML_NAMESPACE)).toBe(true);
    expect(html.isDefaultNamespace(SVG_NAMESPACE)).toBe(false);
    expect(html.isDefaultNamespace(null)).toBe(false);
    expect(html.isDefaultNamespace('')).toBe(false);

    expect(svg.isDefaultNamespace(SVG_NAMESPACE)).toBe(true);
    expect(svg.isDefaultNamespace(HTML_NAMESPACE)).toBe(false);
    expect(svg.isDefaultNamespace(null)).toBe(false);
    expect(text.isDefaultNamespace(SVG_NAMESPACE)).toBe(true);
  });

  it('uses default xmlns declarations for prefixed elements', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg:svg');

    expect(svg.isDefaultNamespace(SVG_NAMESPACE)).toBe(false);
    expect(svg.isDefaultNamespace(null)).toBe(true);

    svg.setAttributeNS(XMLNS_NAMESPACE, 'xmlns', SVG_NAMESPACE);

    expect(svg.isDefaultNamespace(SVG_NAMESPACE)).toBe(true);
    expect(svg.isDefaultNamespace(null)).toBe(false);
  });

  it('inherits and overrides default xmlns declarations from ancestors', () => {
    const parent = document.createElementNS('urn:parent', 'parent:parent');
    const child = document.createElementNS('urn:child', 'child:child');
    parent.setAttributeNS(XMLNS_NAMESPACE, 'xmlns', 'urn:parent-default');
    parent.appendChild(child);

    expect(child.isDefaultNamespace('urn:parent-default')).toBe(true);

    child.setAttributeNS(XMLNS_NAMESPACE, 'xmlns', 'urn:child-default');

    expect(child.isDefaultNamespace('urn:child-default')).toBe(true);
    expect(child.isDefaultNamespace('urn:parent-default')).toBe(false);
  });

  it('treats an empty default xmlns declaration as null', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg:svg');
    svg.setAttributeNS(XMLNS_NAMESPACE, 'xmlns', '');

    expect(svg.isDefaultNamespace(null)).toBe(true);
    expect(svg.isDefaultNamespace('')).toBe(true);
    expect(svg.isDefaultNamespace(SVG_NAMESPACE)).toBe(false);
  });

  it('uses an attached attribute owner as namespace context', () => {
    const html = document.createElement('div');
    html.setAttribute('data-example', 'value');
    const attached = html.attributes.getNamedItem('data-example')!;
    const detached = new Attr('data-example', 'value');

    expect(attached.isDefaultNamespace(HTML_NAMESPACE)).toBe(true);
    expect(attached.isDefaultNamespace(null)).toBe(false);
    expect(detached.isDefaultNamespace(null)).toBe(true);
    expect(detached.isDefaultNamespace(HTML_NAMESPACE)).toBe(false);
  });
});

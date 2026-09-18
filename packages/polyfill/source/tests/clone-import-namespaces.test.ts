import {beforeEach, describe, expect, it} from 'vitest';

import {Attr} from '../Attr.ts';
import {CONTENT, HOOKS, HTML_NAMESPACE, SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';
import type {HTMLTemplateElement} from '../HTMLTemplateElement.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

const DEEP_TEMPLATE_LEVELS = 6_000;

function createDeepTemplateTree(ownerDocument: Window['document']) {
  const root = ownerDocument.createElement('template') as HTMLTemplateElement;
  let current = root;

  for (let i = 0; i < DEEP_TEMPLATE_LEVELS; i++) {
    const child = ownerDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    current.content.appendChild(child);
    current = child;
  }

  current.content.appendChild(ownerDocument.createTextNode('leaf'));
  return root;
}

function expectDeepTemplateCopy(
  source: HTMLTemplateElement,
  copy: HTMLTemplateElement,
  ownerDocument: Window['document'],
) {
  let sourceTemplate = source;
  let copiedTemplate = copy;

  // Avoid recursively formatting the 6,000-level documents on assertion failure.
  for (let i = 0; i < DEEP_TEMPLATE_LEVELS; i++) {
    expect(copiedTemplate === sourceTemplate).toBe(false);
    expect(copiedTemplate.ownerDocument === ownerDocument).toBe(true);
    expect(copiedTemplate.content.ownerDocument === ownerDocument).toBe(true);

    sourceTemplate = sourceTemplate.content.firstChild as HTMLTemplateElement;
    copiedTemplate = copiedTemplate.content.firstChild as HTMLTemplateElement;
    expect(copiedTemplate.localName).toBe('template');
  }

  expect(copiedTemplate === sourceTemplate).toBe(false);
  expect(copiedTemplate.ownerDocument === ownerDocument).toBe(true);
  expect(copiedTemplate.content.ownerDocument === ownerDocument).toBe(true);
  const sourceLeaf = sourceTemplate.content.firstChild;
  const copiedLeaf = copiedTemplate.content.firstChild;
  expect(copiedLeaf === sourceLeaf).toBe(false);
  expect(copiedLeaf?.nodeValue).toBe('leaf');
  expect(copiedLeaf?.ownerDocument === ownerDocument).toBe(true);
}

describe('Node.cloneNode()', () => {
  it('preserves SVG element shape, qualified names, and attributes', () => {
    const gradient = document.createElementNS(
      SVG_NAMESPACE,
      'svg:linearGradient',
    );
    gradient.setAttribute('viewBox', '0 0 10 10');
    gradient.setAttributeNS('urn:paint', 'paint:Color', 'red');
    gradient.appendChild(document.createElementNS(SVG_NAMESPACE, 'stop'));

    const shallow = gradient.cloneNode() as typeof gradient;
    const deep = gradient.cloneNode(true) as typeof gradient;

    for (const clone of [shallow, deep]) {
      expect(clone).toBeInstanceOf(window.SVGElement);
      expect(clone.namespaceURI).toBe(SVG_NAMESPACE);
      expect(clone.prefix).toBe('svg');
      expect(clone.localName).toBe('linearGradient');
      expect(clone.nodeName).toBe('svg:linearGradient');
      expect(clone.getAttributeNames()).toEqual(['viewBox', 'paint:Color']);
      expect(clone.getAttribute('viewBox')).toBe('0 0 10 10');
      expect(clone.getAttributeNS('urn:paint', 'Color')).toBe('red');
    }

    expect(shallow.childNodes).toHaveLength(0);
    expect(deep.childNodes).toHaveLength(1);
    expect(deep.firstChild).not.toBe(gradient.firstChild);
    expect(deep.firstChild).toBeInstanceOf(window.SVGElement);
    expect((deep.firstChild as typeof gradient).namespaceURI).toBe(
      SVG_NAMESPACE,
    );
  });

  it('preserves deep-clone hook ordering', () => {
    const source = document.createElement('div');
    const child = document.createElement('section');
    child.appendChild(document.createElement('span'));
    source.appendChild(child);
    const calls: string[] = [];
    window[HOOKS].createElement = (element) => {
      calls.push(`create:${element.localName}`);
    };
    window[HOOKS].insertChild = (parent, node) => {
      calls.push(`insert:${parent.localName}:${node.nodeName.toLowerCase()}`);
    };

    source.cloneNode(true);

    expect(calls).toEqual([
      'create:div',
      'create:section',
      'create:span',
      'insert:section:span',
      'insert:div:section',
    ]);
  });

  it.each(['has:colon', ':leading', 'trailing:', 'xml:thing', 'xmlns:thing'])(
    'preserves the established literal-colon element name %s',
    (name) => {
      const source = document.createElement(name);
      source.append('child');
      const destination = new Window().document;

      const clone = source.cloneNode(true) as typeof source;
      const imported = destination.importNode(source, true) as typeof source;

      for (const copy of [clone, imported]) {
        expect(copy.namespaceURI).toBe(HTML_NAMESPACE);
        expect(copy.prefix).toBeNull();
        expect(copy.localName).toBe(source.localName);
        expect(copy.nodeName).toBe(source.nodeName);
        expect(copy.textContent).toBe('child');
      }
      expect(clone.ownerDocument).toBe(document);
      expect(imported.ownerDocument).toBe(destination);
      expect(imported.firstChild?.ownerDocument).toBe(destination);
    },
  );

  it('preserves unnamespaced colon attributes without reparsing them', () => {
    const html = document.createElement('div');
    html.setAttribute('Data:State', 'html');
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('Data:State', 'svg');
    const destination = new Window().document;

    for (const [source, expectedName] of [
      [html, 'data:state'],
      [svg, 'Data:State'],
    ] as const) {
      const clone = source.cloneNode() as typeof source;
      const imported = destination.importNode(source) as typeof source;

      for (const copy of [clone, imported]) {
        const attribute = copy.attributes.item(0)!;
        expect(attribute.name).toBe(expectedName);
        expect(attribute.localName).toBe(expectedName);
        expect(attribute.prefix).toBeNull();
        expect(attribute.namespaceURI).toBeNull();
        expect(attribute.value).toBe(source.getAttribute(expectedName));
      }
      expect(imported.attributes.item(0)?.ownerDocument).toBe(destination);
    }
  });

  it('keeps shallow templates empty and deeply clones direct and content children', () => {
    const template = document.createElement('template');
    const direct = document.createElement('aside');
    direct.append('direct');
    const section = document.createElement('section');
    const nested = document.createElement('template');
    const nestedDirect = document.createElement('em');
    nestedDirect.append('nested direct');
    const nestedContent = document.createElement('strong');
    nestedContent.append('nested content');
    nested.append(nestedDirect);
    nested.content.append(nestedContent);
    section.append('before', nested, 'after');
    template.append(direct);
    template.content.append(section);

    const shallow = template.cloneNode() as typeof template;

    expect(shallow).toBeInstanceOf(window.HTMLTemplateElement);
    expect(shallow.childNodes).toHaveLength(0);
    expect((shallow as any)[CONTENT]).toBeUndefined();
    expect(shallow.content.childNodes).toHaveLength(0);
    expect(template.firstChild).toBe(direct);
    expect(template.content.firstChild).toBe(section);

    const deep = template.cloneNode(true) as typeof template;
    const clonedDirect = deep.firstChild as typeof direct;
    const clonedSection = deep.content.firstChild as typeof section;
    const clonedNested = deep.content.querySelector(
      'template',
    ) as typeof nested;

    expect(deep).toBeInstanceOf(window.HTMLTemplateElement);
    expect(clonedDirect).not.toBe(direct);
    expect(clonedDirect.textContent).toBe('direct');
    expect(clonedSection).not.toBe(section);
    expect(clonedSection.ownerDocument).toBe(document);
    expect(clonedNested).not.toBe(nested);
    expect(clonedNested).toBeInstanceOf(window.HTMLTemplateElement);
    expect(clonedNested.firstChild).not.toBe(nestedDirect);
    expect(clonedNested.firstChild?.textContent).toBe('nested direct');
    expect(clonedNested.content.textContent).toBe('nested content');
    expect(clonedNested.content.firstChild).not.toBe(nestedContent);
    expect(clonedNested.content.firstChild?.ownerDocument).toBe(document);
  });

  it('clones a 6,000-level template content tree without overflowing', () => {
    const source = createDeepTemplateTree(document);

    const clone = source.cloneNode(true) as HTMLTemplateElement;

    expectDeepTemplateCopy(source, clone, document);
  }, 15_000);

  it('rejects cyclic or repeated malformed node graphs', () => {
    const cyclic = document.createElement('template');
    cyclic.content.childNodes.push(cyclic);
    const repeated = document.createElement('div');
    const child = document.createElement('span');
    repeated.childNodes.push(child, child);

    for (const source of [cyclic, repeated]) {
      expect(() => source.cloneNode(true)).toThrowError(
        'Cannot clone a cyclic or repeated node graph',
      );
    }
  });

  it('clones attributes without retaining their owner element', () => {
    const element = document.createElementNS(SVG_NAMESPACE, 'svg');
    element.setAttributeNS('urn:example', 'ex:State', 'ready');
    const attribute = element.attributes.item(0)!;

    const clone = attribute.cloneNode() as Attr;

    expect(clone).toBeInstanceOf(Attr);
    expect(clone).not.toBe(attribute);
    expect(clone.name).toBe('ex:State');
    expect(clone.localName).toBe('State');
    expect(clone.prefix).toBe('ex');
    expect(clone.namespaceURI).toBe('urn:example');
    expect(clone.value).toBe('ready');
    expect(clone.ownerElement).toBeNull();
    expect(clone.ownerDocument).toBe(document);
  });
});

describe('Document.importNode()', () => {
  it('preserves SVG namespaces and qualified names across documents', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg:svg');
    const gradient = document.createElementNS(
      SVG_NAMESPACE,
      'svg:linearGradient',
    );
    gradient.setAttribute('viewBox', '0 0 10 10');
    svg.appendChild(gradient);
    const destination = new Window().document;

    const imported = destination.importNode(svg, true) as typeof svg;
    const importedGradient = imported.firstChild as typeof gradient;

    expect(imported).toBeInstanceOf(window.SVGElement);
    expect(imported.ownerDocument).toBe(destination);
    expect(imported.nodeName).toBe('svg:svg');
    expect(importedGradient).toBeInstanceOf(window.SVGElement);
    expect(importedGradient.ownerDocument).toBe(destination);
    expect(importedGradient.namespaceURI).toBe(SVG_NAMESPACE);
    expect(importedGradient.prefix).toBe('svg');
    expect(importedGradient.localName).toBe('linearGradient');
    expect(importedGradient.nodeName).toBe('svg:linearGradient');
    expect(importedGradient.getAttributeNames()).toEqual(['viewBox']);
  });

  it('preserves custom namespaces and prefixed names across documents', () => {
    const source = document.createElementNS('urn:example', 'ex:Widget');
    source.setAttributeNS('urn:metadata', 'meta:State', 'ready');
    source.appendChild(document.createElementNS('urn:child', 'child:Part'));
    const destination = new Window().document;

    const imported = destination.importNode(source, true) as typeof source;
    const importedChild = imported.firstChild as typeof source;

    expect(imported.ownerDocument).toBe(destination);
    expect(imported.namespaceURI).toBe('urn:example');
    expect(imported.prefix).toBe('ex');
    expect(imported.localName).toBe('Widget');
    expect(imported.nodeName).toBe('ex:Widget');
    expect(imported.getAttributeNS('urn:metadata', 'State')).toBe('ready');
    expect(imported.attributes.item(0)?.name).toBe('meta:State');
    expect(importedChild.ownerDocument).toBe(destination);
    expect(importedChild.namespaceURI).toBe('urn:child');
    expect(importedChild.nodeName).toBe('child:Part');
  });

  it('imports a 6,000-level template content tree without overflowing', () => {
    const source = createDeepTemplateTree(document);
    const destination = new Window().document;

    const imported = destination.importNode(
      source,
      true,
    ) as HTMLTemplateElement;

    expectDeepTemplateCopy(source, imported, destination);
  }, 15_000);

  it('imports attributes and mixed template trees into the destination document', () => {
    const element = document.createElement('div');
    element.setAttributeNS('urn:example', 'ex:State', 'ready');
    const attribute = element.attributes.item(0)!;
    const template = document.createElement('template');
    const direct = document.createElement('aside');
    direct.append('direct');
    const contentChild = document.createElement('section');
    const nested = document.createElement('template');
    const nestedDirect = document.createElement('em');
    const nestedContent = document.createElement('strong');
    nested.append(nestedDirect);
    nested.content.append(nestedContent);
    contentChild.append(nested);
    template.append(direct);
    template.content.append(contentChild);
    const destinationWindow = new Window();
    const destination = destinationWindow.document;

    const importedAttribute = destination.importNode(attribute) as Attr;
    const importedTemplate = destination.importNode(
      template,
      true,
    ) as typeof template;
    const importedDirect = importedTemplate.firstChild as typeof direct;
    const importedContentChild = importedTemplate.content
      .firstChild as typeof contentChild;
    const importedNested = importedContentChild.firstChild as typeof nested;

    expect(importedAttribute.name).toBe('ex:State');
    expect(importedAttribute.value).toBe('ready');
    expect(importedAttribute.namespaceURI).toBe('urn:example');
    expect(importedAttribute.ownerElement).toBeNull();
    expect(importedAttribute.ownerDocument).toBe(destination);
    expect(importedTemplate).toBeInstanceOf(
      destinationWindow.HTMLTemplateElement,
    );
    expect(importedTemplate.ownerDocument).toBe(destination);
    expect(importedDirect).not.toBe(direct);
    expect(importedDirect.ownerDocument).toBe(destination);
    expect(importedTemplate.content.ownerDocument).toBe(destination);
    expect(importedContentChild).not.toBe(contentChild);
    expect(importedContentChild.ownerDocument).toBe(destination);
    expect(importedNested).not.toBe(nested);
    expect(importedNested.ownerDocument).toBe(destination);
    expect(importedNested.firstChild?.ownerDocument).toBe(destination);
    expect(importedNested.content.ownerDocument).toBe(destination);
    expect(importedNested.content.firstChild?.ownerDocument).toBe(destination);
  });
});

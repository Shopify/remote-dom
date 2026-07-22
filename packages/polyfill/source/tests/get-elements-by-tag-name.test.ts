import {NamespaceURI} from '../constants.ts';
import {Window} from '../index.ts';
import {NodeList} from '../NodeList.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('getElementsByTagName', () => {
  it('is exposed on Document and Element but not DocumentFragment', () => {
    expect(document.getElementsByTagName).toBeTypeOf('function');
    expect(document.body.getElementsByTagName).toBeTypeOf('function');
    expect(
      (document.createDocumentFragment() as any).getElementsByTagName,
    ).toBeUndefined();
  });

  it('finds descendant HTML elements case-insensitively', () => {
    document.body.innerHTML = '<main><div></div><DIV></DIV></main>';

    expect(document.getElementsByTagName('body')[0]).toBe(document.body);
    expect(document.body.getElementsByTagName('DIV')).toHaveLength(2);
    expect(document.body.getElementsByTagName('*')).toHaveLength(3);
  });

  it('matches non-HTML tag names case-sensitively', () => {
    const svg = document.createElementNS(NamespaceURI.SVG, 'svg');
    const gradient = document.createElementNS(
      NamespaceURI.SVG,
      'linearGradient',
    );
    svg.appendChild(gradient);
    document.body.appendChild(svg);

    expect(document.getElementsByTagName('linearGradient')[0]).toBe(gradient);
    expect(document.getElementsByTagName('lineargradient')).toHaveLength(0);
  });

  it('returns a NodeList with an item() method', () => {
    document.body.innerHTML = '<div><span></span><p></p></div>';
    const results = document.body.getElementsByTagName('*');
    expect(results).toBeInstanceOf(NodeList);
    expect(results.item).toBeTypeOf('function');
    expect(results.item(0)?.localName).toBe('div');
    expect(results.item(1)?.localName).toBe('span');
    expect(results.item(3)).toBeNull();
  });
});

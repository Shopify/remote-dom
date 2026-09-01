import {SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';

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
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    const gradient = document.createElementNS(SVG_NAMESPACE, 'linearGradient');
    svg.appendChild(gradient);
    document.body.appendChild(svg);

    expect(document.getElementsByTagName('linearGradient')[0]).toBe(gradient);
    expect(document.getElementsByTagName('lineargradient')).toHaveLength(0);
  });
});

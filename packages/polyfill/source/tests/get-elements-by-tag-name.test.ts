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

  it.each(['Document', 'Element'])(
    'uses WPT-derived ASCII matching for %s.getElementsByTagName()',
    (contextType) => {
      const parent =
        contextType === 'Document'
          ? document.body
          : document.createElement('section');
      const context = contextType === 'Document' ? document : parent;
      const uppercaseHtml = document.createElementNS(
        'http://www.w3.org/1999/xhtml',
        'I',
      );
      const nonAsciiHtml = document.createElement('aÇ');
      const kelvinHtml = document.createElement('aK');
      const prefixedHtml = document.createElementNS(
        'http://www.w3.org/1999/xhtml',
        'test:aÇ',
      );
      const prefixedForeign = document.createElementNS('test', 'te:ST');
      parent.append(
        uppercaseHtml,
        nonAsciiHtml,
        kelvinHtml,
        prefixedHtml,
        prefixedForeign,
      );

      expect(context.getElementsByTagName('I')).toHaveLength(0);
      expect(context.getElementsByTagName('i')).toHaveLength(0);
      expect(context.getElementsByTagName('AÇ')).toEqual([nonAsciiHtml]);
      expect(context.getElementsByTagName('aÇ')).toEqual([nonAsciiHtml]);
      expect(context.getElementsByTagName('aç')).toHaveLength(0);
      expect(context.getElementsByTagName('AK')).toEqual([kelvinHtml]);
      expect(context.getElementsByTagName('aK')).toEqual([kelvinHtml]);
      expect(context.getElementsByTagName('ak')).toHaveLength(0);
      expect(context.getElementsByTagName('TEST:AÇ')).toEqual([prefixedHtml]);
      expect(context.getElementsByTagName('test:aç')).toHaveLength(0);
      expect(context.getElementsByTagName('te:ST')).toEqual([prefixedForeign]);
      expect(context.getElementsByTagName('te:st')).toHaveLength(0);
    },
  );
});

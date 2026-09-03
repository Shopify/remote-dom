import {beforeEach, describe, expect, it} from 'vitest';

import {NodeList} from '../NodeList.ts';
import {Window} from '../Window.ts';
import type {Element} from '../Element.ts';

describe('getElementsByClassName', () => {
  let window: Window;

  beforeEach(() => {
    window = new Window();
  });

  it('is exposed on Document and Element but not DocumentFragment', () => {
    expect(window.document.getElementsByClassName).toBeTypeOf('function');
    expect(window.document.body.getElementsByClassName).toBeTypeOf('function');
    expect(
      (window.document.createDocumentFragment() as any).getElementsByClassName,
    ).toBeUndefined();
  });

  it('finds descendants containing every requested class in tree order', () => {
    window.document.body.innerHTML = `
      <main class="card selected">
        <div class="selected card first"></div>
        <section><span class="card selected last"></span></section>
        <div class="card"></div>
      </main>
    `;

    const matches = window.document.getElementsByClassName('card selected');
    const withinMain = matches[0]!.getElementsByClassName('selected card');

    expect(matches.map((element: Element) => element.localName)).toEqual([
      'main',
      'div',
      'span',
    ]);
    expect(withinMain.map((element: Element) => element.localName)).toEqual([
      'div',
      'span',
    ]);
  });

  it('treats class names literally instead of parsing a selector', () => {
    const element = window.document.createElement('div');
    element.setAttribute('class', 'has.dot has:colon');
    window.document.body.appendChild(element);

    expect(window.document.getElementsByClassName('has.dot')[0]).toBe(element);
    expect(window.document.getElementsByClassName('has:colon')[0]).toBe(
      element,
    );
  });

  it('coerces null to the literal class name "null"', () => {
    const element = window.document.createElement('div');
    element.setAttribute('class', 'null');
    window.document.body.appendChild(element);

    expect(window.document.getElementsByClassName(null as any)[0]).toBe(
      element,
    );
  });

  it('uses ASCII whitespace, removes duplicate names, and handles empty input', () => {
    const element = window.document.createElement('div');
    element.setAttribute('class', 'one\ttwo\nthree\ffour\rfive');
    window.document.body.appendChild(element);

    expect(
      window.document.getElementsByClassName(
        ' one one two three four five ',
      )[0],
    ).toBe(element);
    expect(
      window.document.getElementsByClassName('one\ttwo\nthree\ffour\rfive')[0],
    ).toBe(element);
    expect(window.document.getElementsByClassName('   ')).toHaveLength(0);
  });

  it.skip('does not treat non-breaking space as a class separator', () => {
    const literal = window.document.createElement('div');
    literal.setAttribute('class', 'left\u00a0right');

    const separated = window.document.createElement('div');
    separated.setAttribute('class', 'left right');

    window.document.body.append(literal, separated);

    const literalMatches =
      window.document.getElementsByClassName('left\u00a0right');
    expect(literalMatches).toHaveLength(1);
    expect(literalMatches[0]).toBe(literal);

    const leftMatches = window.document.getElementsByClassName('left');
    expect(leftMatches).toHaveLength(1);
    expect(leftMatches[0]).toBe(separated);
  });

  it.skip('returns the polyfill collection with item() access', () => {
    window.document.body.innerHTML = '<div class="match"></div>';

    const matches = window.document.getElementsByClassName('match');

    expect(matches).toBeInstanceOf(NodeList);
    expect((matches as any).item(0)).toBe(matches[0]);
  });
});

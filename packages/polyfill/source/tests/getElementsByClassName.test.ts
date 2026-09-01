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

  it('uses ASCII whitespace, removes duplicate names, and handles empty input', () => {
    const element = window.document.createElement('div');
    element.setAttribute('class', 'one\ttwo\nthree');
    window.document.body.appendChild(element);

    expect(window.document.getElementsByClassName(' one one\ttwo ')[0]).toBe(
      element,
    );
    expect(window.document.getElementsByClassName('   ')).toHaveLength(0);
  });

  it('returns the polyfill collection with item() access', () => {
    window.document.body.innerHTML = '<div class="match"></div>';

    const matches = window.document.getElementsByClassName('match');

    expect(matches).toBeInstanceOf(NodeList);
    expect(matches.item(0)).toBe(matches[0]);
  });
});

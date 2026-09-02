import {Window} from '../index.ts';
import {NodeList} from '../NodeList.ts';
import type {Element as PolyfillElement} from '../Element.ts';
import {
  MATCHER_CLASS,
  MATCHER_ELEMENT,
  MATCHER_ID,
  MATCHER_UNKNOWN,
  parseSelector,
  querySelector,
  querySelectorAll,
} from '../selectors.ts';
import type {ParentNode} from '../ParentNode.ts';

const MatcherType = {
  Unknown: MATCHER_UNKNOWN,
  Element: MATCHER_ELEMENT,
  Id: MATCHER_ID,
  Class: MATCHER_CLASS,
} as const;

import {describe, it, expect, expectTypeOf, beforeEach} from 'vitest';

describe('selector parsing and matching', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  describe('parseSelector', () => {
    it('parses element selectors', () => {
      const parts = parseSelector('div');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 1, // MatcherType.Element
        name: 'div',
        value: 'div',
      });
    });

    it('parses ID selectors', () => {
      const parts = parseSelector('#myid');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 2, // MatcherType.Id
        name: 'myid',
        value: 'myid',
      });
    });

    it('parses class selectors', () => {
      const parts = parseSelector('.myclass');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 3, // MatcherType.Class
        name: 'myclass',
        value: 'myclass',
      });
    });

    it('parses attribute selectors without values', () => {
      const parts = parseSelector('[disabled]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 4, // MatcherType.Attribute
        name: 'disabled',
        value: undefined,
      });
    });

    it('parses attribute selectors with values', () => {
      const parts = parseSelector('[type="button"]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 4, // MatcherType.Attribute
        name: 'type',
        value: 'button',
      });
    });

    it('parses pseudo-class selectors', () => {
      const parts = parseSelector(':hover');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 5, // MatcherType.Pseudo
        name: 'hover',
        value: undefined,
      });
    });

    it('parses function selectors', () => {
      const parts = parseSelector(':has(div)');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 6, // MatcherType.Function
        name: 'has',
        value: 'div',
      });
    });

    it('parses :not() function selectors', () => {
      const parts = parseSelector(':not(.hidden)');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: 6, // MatcherType.Function
        name: 'not',
        value: '.hidden',
      });
    });

    it.each([
      [':not(:has(.missing))', ':has(.missing)'],
      [':has(span:not(.missing))', 'span:not(.missing)'],
      [':has(> .hit)', '> .hit'],
      [':has([data-label=")value("])', '[data-label=")value("]'],
    ])('parses the balanced argument in %s', (selector, value) => {
      expect(parseSelector(selector)[0]!.matchers[0]!.value).toBe(value);
    });

    it.each([
      [':HAS(div)', 6, 'has', 'div'],
      [':Not(.Hidden)', 6, 'not', '.Hidden'],
      [':HOVER', 5, 'hover', undefined],
    ])(
      'ASCII-lowercases only the pseudo-class name in %s',
      (selector, type, name, value) => {
        expect(parseSelector(selector)[0]!.matchers[0]!).toMatchObject({
          type,
          name,
          value,
        });
      },
    );

    it('parses compound selectors', () => {
      const parts = parseSelector('div.myclass#myid[type="button"]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers).toHaveLength(4);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[0]!.matchers[1]!.name).toBe('myclass');
      expect(parts[0]!.matchers[2]!.name).toBe('myid');
      expect(parts[0]!.matchers[3]!.name).toBe('type');
    });

    it('parses child combinator', () => {
      const parts = parseSelector('div > span');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(1); // Combinator.Child
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[1]!.matchers[0]!.name).toBe('span');
    });

    it('parses descendant combinator', () => {
      const parts = parseSelector('div span');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(0); // Combinator.Descendant
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[1]!.matchers[0]!.name).toBe('span');
    });

    it('parses adjacent sibling combinator', () => {
      const parts = parseSelector('h1 + p');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(3); // Combinator.Adjacent
      expect(parts[0]!.matchers[0]!.name).toBe('h1');
      expect(parts[1]!.combinator).toBe(4); // Combinator.Inner
      expect(parts[1]!.matchers[0]!.name).toBe('p');
    });

    it('parses general sibling combinator', () => {
      const parts = parseSelector('h1 ~ p');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(2); // Combinator.Sibling
      expect(parts[0]!.matchers[0]!.name).toBe('h1');
      expect(parts[1]!.combinator).toBe(4); // Combinator.Inner
      expect(parts[1]!.matchers[0]!.name).toBe('p');
    });

    it('parses complex selectors', () => {
      const parts = parseSelector('article > .header + .content:not(.hidden)');
      expect(parts).toHaveLength(3);
      expect(parts[0]!.combinator).toBe(1); // Child
      expect(parts[1]!.combinator).toBe(3); // Adjacent
      expect(parts[2]!.combinator).toBe(4); // Inner
      expect(parts[0]!.matchers[0]!.name).toBe('article');
      expect(parts[1]!.matchers[0]!.name).toBe('header');
      expect(parts[2]!.matchers).toHaveLength(2);
      expect(parts[2]!.matchers[0]!.name).toBe('content');
      expect(parts[2]!.matchers[1]!.name).toBe('not');
    });
  });

  describe('querySelector and querySelectorAll', () => {
    let container: Element;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <article class="post" id="main-post">
          <h1 class="title">Main Title</h1>
          <div class="content">
            <p class="text">First paragraph</p>
            <p class="text hidden">Hidden paragraph</p>
            <span class="highlight">Highlighted text</span>
          </div>
          <aside class="sidebar">
            <ul class="nav">
              <li><a href="#" class="link active">Active Link</a></li>
              <li><a href="#" class="link">Regular Link</a></li>
            </ul>
          </aside>
        </article>
        <footer class="footer">
          <div class="content">
            <p class="text">Footer text</p>
          </div>
        </footer>
      `;
      container.querySelector('article')!.setAttribute('DATA-STATE', 'Ready');
      container.querySelector('.highlight')!.setAttribute('data-label', 'a)b');
    });

    it('types instance query results as elements', () => {
      const matches = new Window().document
        .createElement('div')
        .querySelectorAll('p');

      expectTypeOf(matches).toEqualTypeOf<NodeList<PolyfillElement>>();
      expectTypeOf(matches[0]!).toEqualTypeOf<PolyfillElement>();
      expectTypeOf(matches.item(0)).toEqualTypeOf<PolyfillElement | null>();
    });

    it('selects HTML element names case-insensitively', () => {
      const articles = container.querySelectorAll('ARTICLE');
      expect(articles).toHaveLength(1);
      expect(articles[0]!.getAttribute('class')).toBe('post');

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(3);
    });

    it('returns a static NodeList-compatible collection', () => {
      const matches = container.querySelectorAll('.text');
      const text = [...matches].map((element) => element.textContent?.trim());
      const visited: string[] = [];

      matches.forEach((element) => visited.push(element.textContent?.trim()!));
      container.appendChild(document.createElement('p')).className = 'text';

      expect(matches).toBeInstanceOf(NodeList);
      expect(matches).toHaveLength(3);
      expect(matches.item(0)).toBe(matches[0]);
      expect(matches.item(-1)).toBeNull();
      expect(matches.item(matches.length)).toBeNull();
      expect(
        [...matches].map((element) => element.textContent?.trim()),
      ).toEqual(text);
      expect(visited).toEqual(text);
    });

    it('does not fold stored createElementNS HTML names', () => {
      const uppercase = document.createElementNS(
        'http://www.w3.org/1999/xhtml',
        'I',
      );
      container.appendChild(uppercase);

      expect(container.querySelectorAll('i')).toHaveLength(0);
      expect(container.querySelectorAll('I')).toHaveLength(0);

      const normalized = document.createElement('I');
      container.appendChild(normalized);

      expect(container.querySelectorAll('i')).toEqual([normalized]);
      expect(container.querySelectorAll('I')).toEqual([normalized]);
    });

    it('selects by ID', () => {
      const main = container.querySelector('#main-post');
      expect(main?.tagName.toLowerCase()).toBe('article');
    });

    it('selects by class', () => {
      const texts = container.querySelectorAll('.text');
      expect(texts).toHaveLength(3);

      const hidden = container.querySelector('.hidden');
      expect(hidden?.textContent?.trim()).toBe('Hidden paragraph');
    });

    it('selects by attribute', () => {
      const links = container.querySelectorAll('[href]');
      expect(links).toHaveLength(2);

      const activeLinks = container.querySelectorAll('[href="#"]');
      expect(activeLinks).toHaveLength(2);
    });
    it('selects by an unquoted exact attribute value', () => {
      expect(container.querySelectorAll('[class=content]')).toHaveLength(2);
    });

    it('rejects a different unquoted exact attribute value', () => {
      expect(container.querySelector('[class=contents]')).toBeNull();
    });

    it.each([
      ['quoted', 'article[data-state="Ready"]', true],
      ['unquoted', 'article[data-state=Ready]', true],
      ['normalized HTML name', 'article[DATA-STATE=Ready]', true],
      ['quoted case-sensitive value', 'article[data-state="ready"]', false],
      ['unquoted case-sensitive value', 'article[data-state=ready]', false],
    ])('matches %s exact attribute equality', (_name, selector, matches) => {
      expect(container.querySelector(selector) != null).toBe(matches);
    });

    it('selects by compound selectors', () => {
      const activeLink = container.querySelector('a.link.active');
      expect(activeLink?.textContent?.trim()).toBe('Active Link');

      const hiddenText = container.querySelector('p.text.hidden');
      expect(hiddenText?.textContent?.trim()).toBe('Hidden paragraph');
    });

    it('selects with descendant combinator', () => {
      const contentTexts = container.querySelectorAll('.content p');
      expect(contentTexts).toHaveLength(3);

      const sidebarLinks = container.querySelectorAll('.sidebar a');
      expect(sidebarLinks).toHaveLength(2);
    });

    it('selects with child combinator', () => {
      const directContentChildren = container.querySelectorAll('.content > p');
      expect(directContentChildren).toHaveLength(3);

      const directArticleChildren = container.querySelectorAll('article > h1');
      expect(directArticleChildren).toHaveLength(1);
    });
    it('preserves the matched ancestor through chained combinators', () => {
      const activeLink = container.querySelector('article > .sidebar a.active');

      expect(activeLink?.textContent?.trim()).toBe('Active Link');
    });

    it('does not restart chained combinators from the leaf', () => {
      expect(container.querySelector('li > .sidebar a.active')).toBeNull();
    });

    it.each([
      ['child', 'article > .sidebar > .nav > li > a.active'],
      ['descendant', 'article .sidebar .nav li a.active'],
      ['adjacent sibling', 'h1 + .content + .sidebar'],
      ['general sibling', 'h1 ~ .content ~ .sidebar'],
    ])('preserves state across a 3+ part %s chain', (_name, selector) => {
      expect(container.querySelector(selector)).not.toBeNull();
    });

    it.each([
      ['child', 'article > .sidebar > li > a.active'],
      ['descendant', 'footer .sidebar .nav a.active'],
      ['adjacent sibling', 'h1 + .sidebar + .content'],
      ['general sibling', '.sidebar ~ .content ~ footer'],
    ])('rejects an invalid 3+ part %s chain', (_name, selector) => {
      expect(container.querySelector(selector)).toBeNull();
    });

    it('selects with adjacent sibling combinator', () => {
      const titleSibling = container.querySelector('h1 + div');
      expect(titleSibling?.getAttribute('class')).toBe('content');
    });

    it('selects with general sibling combinator', () => {
      const titleSiblings = container.querySelectorAll('h1 ~ div');
      expect(titleSiblings).toHaveLength(1);

      const contentSiblings = container.querySelectorAll('.content ~ aside');
      expect(contentSiblings).toHaveLength(1);
    });

    it('selects with :has() pseudo-class', () => {
      const hasLinks = container.querySelectorAll(':has(a)');
      expect(hasLinks.length).toBeGreaterThan(0);

      const hasActiveLink = container.querySelector(':has(.active)');
      expect(hasActiveLink).toBeTruthy();
    });
    it('matches :has() against descendants', () => {
      expect(container.querySelector('article:has(.active)')?.id).toBe(
        'main-post',
      );
    });

    it('does not match :has() without a matching descendant', () => {
      expect(container.querySelector('footer:has(.active)')).toBeNull();
    });

    it.each([
      ['direct child', 'article:has(> h1)'],
      ['child with descendant', 'article:has(> .content .highlight)'],
      ['adjacent sibling', 'article:has(+ footer)'],
      ['general sibling', 'article:has(~ footer)'],
    ])(
      'matches scoped :has() with a leading %s relation',
      (_name, selector) => {
        document.body.appendChild(container);
        expect(document.body.querySelector(selector)?.id).toBe('main-post');
      },
    );

    it.each([
      ['outside ancestor', 'article:has(body .active)'],
      ['scope as explicit ancestor', 'article:has(article .active)'],
      ['scope id as explicit ancestor', 'article:has(#main-post .active)'],
      ['non-child descendant', 'article:has(> .active)'],
      ['wrong adjacent direction', 'footer:has(+ article)'],
    ])('rejects :has() with %s', (_name, selector) => {
      document.body.appendChild(container);
      expect(document.body.querySelector(selector)).toBeNull();
    });

    it('matches nested functional pseudo-classes', () => {
      expect(container.querySelector('article:not(:has(.missing))')?.id).toBe(
        'main-post',
      );
      expect(container.querySelector('article:not(:has(.active))')).toBeNull();
      expect(
        container.querySelector('article:has(span:not(.missing))')?.id,
      ).toBe('main-post');
      expect(
        container.querySelector('footer:has(span:not(.missing))'),
      ).toBeNull();
    });

    it.each([
      ['uppercase simple function', 'article:HAS(.active)'],
      ['mixed-case simple function', 'article:Has(.active)'],
      ['mixed-case negation', 'article:NOT(.footer)'],
      ['nested functions', 'article:NOT(:HAS(.missing))'],
      ['nested descendant function', 'article:HAS(span:NoT(.missing))'],
      ['relative child function', 'article:HAS(> h1)'],
      ['relative sibling function', 'article:hAs(+ footer)'],
    ])('matches %s names ASCII-case-insensitively', (_name, selector) => {
      expect(container.querySelector(selector)?.id).toBe('main-post');
    });

    it.each([
      ['mixed-case negation result', 'article:NoT(.post)'],
      ['class name', 'article:HAS(.ACTIVE)'],
      ['ID', '#MAIN-POST'],
      ['attribute value', 'article:HAS([data-label="A)B"])'],
    ])('does not fold the %s', (_name, selector) => {
      expect(container.querySelector(selector)).toBeNull();
    });

    it('keeps quoted attribute values balanced inside :has()', () => {
      expect(
        container.querySelector('article:has([data-label="a)b"])')?.id,
      ).toBe('main-post');
    });

    it('handles complex selectors', () => {
      const complexSelector = container.querySelectorAll(
        'article .content > p.text',
      );
      expect(complexSelector).toHaveLength(2);

      const deepSelector = container.querySelector('.sidebar ul li a.active');
      expect(deepSelector?.textContent?.trim()).toBe('Active Link');
    });

    it('returns null/empty for non-matching selectors', () => {
      expect(container.querySelector('.nonexistent')).toBeNull();
      expect(container.querySelectorAll('.nonexistent')).toHaveLength(0);

      expect(container.querySelector('table')).toBeNull();
      expect(container.querySelector('#nonexistent-id')).toBeNull();
    });
    it('ignores leading selector whitespace', () => {
      expect(container.querySelector(' \n\tarticle')?.id).toBe('main-post');
    });

    it('does not turn leading whitespace into a match', () => {
      expect(container.querySelector(' \n\tsection')).toBeNull();
    });

    it.each([
      ['leading and trailing', ' \n\tarticle  ', true],
      ['internal child', 'article \n >\t .sidebar ', true],
      ['internal descendant', 'article   .nav\t a.active ', true],
      ['non-match with whitespace', ' \n footer > .sidebar\t ', false],
    ])('handles %s whitespace', (_name, selector, matches) => {
      expect(container.querySelector(selector) != null).toBe(matches);
    });

    it('handles edge cases', () => {
      expect(container.querySelectorAll('')).toHaveLength(0);

      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBeGreaterThan(0);
    });
  });

  describe('querySelector and querySelectorAll with Matcher[] argument', () => {
    let container: Element;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <article class="post" id="main-post">
          <h1 class="title">Main Title</h1>
          <div class="content">
            <p class="text">First paragraph</p>
            <p class="text hidden">Hidden paragraph</p>
            <span class="highlight">Highlighted text</span>
          </div>
        </article>
      `;
    });

    // The standalone querySelector/querySelectorAll functions expect the polyfill's
    // ParentNode, but `container` is typed as the global Element (lib.dom.d.ts).
    // At runtime, Window.setGlobalThis replaces globals with polyfill instances.
    const asPolyfill = (node: Element) => node as unknown as ParentNode;

    it('selects by ID matcher without parsing', () => {
      const main = querySelector(asPolyfill(container), [
        {type: MatcherType.Id, name: 'main-post'},
      ]);
      expect(main?.tagName.toLowerCase()).toBe('article');
    });

    it('types standalone query results as elements', () => {
      const matches = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Element, name: 'p'},
      ]);

      expectTypeOf(matches).toEqualTypeOf<NodeList<PolyfillElement>>();
      expectTypeOf(matches[0]!).toEqualTypeOf<PolyfillElement>();
      expectTypeOf(matches.item(0)).toEqualTypeOf<PolyfillElement | null>();
    });

    it('selects by element matcher without parsing', () => {
      const paragraphs = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Element, name: 'p'},
      ]);
      expect(paragraphs).toHaveLength(2);
    });

    it('matches ids with special characters literally (no CSS escaping)', () => {
      const element = document.createElement('div');
      element.id = 'a.b:c#d';
      container.appendChild(element);

      const result = querySelector(asPolyfill(container), [
        {type: MatcherType.Id, name: 'a.b:c#d'},
      ]);
      expect(result).toBe(element);
    });

    it('matches HTML tag names case-insensitively via element matcher', () => {
      const upper = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Element, name: 'ARTICLE'},
      ]);
      expect(upper).toHaveLength(1);

      const mixed = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Element, name: 'SpAn'},
      ]);
      expect(mixed).toHaveLength(1);
      expect(mixed[0]!.getAttribute('class')).toBe('highlight');
    });

    it('returns same results as string selectors for compound queries', () => {
      const byString = container.querySelectorAll('p.text.hidden');
      const byObject = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Element, name: 'p'},
        {type: MatcherType.Class, name: 'text'},
        {type: MatcherType.Class, name: 'hidden'},
      ]);

      expect(byObject).toHaveLength(byString.length);
      expect(byObject[0]?.textContent?.trim()).toBe('Hidden paragraph');
    });

    it('wildcard matcher returns all elements', () => {
      const all = querySelectorAll(asPolyfill(container), [
        {type: MatcherType.Unknown, name: '*'},
      ]);
      expect(all.length).toBeGreaterThan(0);
      // Should include article, h1, div, p, p, span
      expect(all.length).toBe(6);
    });

    it('returns null/empty for non-matching matchers', () => {
      expect(
        querySelector(asPolyfill(container), [
          {type: MatcherType.Id, name: 'nope'},
        ]),
      ).toBeNull();
      expect(
        querySelectorAll(asPolyfill(container), [
          {type: MatcherType.Element, name: 'table'},
        ]),
      ).toHaveLength(0);
    });
  });
});

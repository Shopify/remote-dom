import {Window} from '../index.ts';
import {parseSelector} from '../selectors.ts';

import {describe, it, expect, beforeEach} from 'vitest';

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
    });

    it('selects by element name', () => {
      const articles = container.querySelectorAll('article');
      expect(articles).toHaveLength(1);
      expect(articles[0]!.getAttribute('class')).toBe('post');

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(3);
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

    it('handles edge cases', () => {
      expect(container.querySelectorAll('')).toHaveLength(0);

      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBeGreaterThan(0);
    });
  });
});

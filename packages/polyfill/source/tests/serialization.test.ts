import {describe, it, expect} from 'vitest';

import {Element} from '../Element';
import {Text} from '../Text';

import {setupScratch} from './helpers';

describe('serialization', () => {
  const ctx = setupScratch();

  describe('set innerHTML', () => {
    describe('plain text', () => {
      it('handles plain text', () => {
        ctx.scratch.innerHTML = 'foo';
        expect(ctx.scratch.childNodes).toHaveLength(1);
        expect(ctx.scratch.childNodes[0]).toBeInstanceOf(Text);
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'foo');
      });

      it('handles encoded entities', () => {
        ctx.scratch.innerHTML = 'foo&amp;bar';
        expect(ctx.scratch.childNodes).toHaveLength(1);
        expect(ctx.scratch.childNodes[0]).toBeInstanceOf(Text);
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'foo&bar');
      });

      it('handles non-encoded entities', () => {
        ctx.scratch.innerHTML = 'foo&bar';
        expect(ctx.scratch.childNodes).toHaveLength(1);
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'foo&bar');
      });
    });

    it('parses single tags', () => {
      ctx.scratch.innerHTML = '<a></a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      expect(ctx.scratch.childNodes[0]).toBeInstanceOf(Element);
      expect(ctx.scratch.childNodes[0]).toHaveProperty('localName', 'a');
    });

    it('parses text children', () => {
      ctx.scratch.innerHTML = '<a>foo</a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child).toBeInstanceOf(Element);
      expect(child.childNodes).toHaveLength(1);
      expect(child.firstChild).toBeInstanceOf(Text);
      expect(child.firstChild).toHaveProperty('data', 'foo');
    });

    it('parses attributes', () => {
      ctx.scratch.innerHTML = '<a href="/link"></a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child.attributes).toHaveLength(1);
      expect(child.attributes.item(0)).toEqual(
        expect.objectContaining({name: 'href', value: '/link'}),
      );
    });

    it('parses multiple attributes', () => {
      ctx.scratch.innerHTML = '<a href="/link" class="test"></a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child.attributes).toHaveLength(2);
      expect(child.attributes.item(0)).toEqual(
        expect.objectContaining({name: 'href', value: '/link'}),
      );
      expect(child.attributes.item(1)).toEqual(
        expect.objectContaining({name: 'class', value: 'test'}),
      );
    });

    it('parses boolean attributes', () => {
      ctx.scratch.innerHTML = '<a disabled></a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child.attributes).toHaveLength(1);
      expect(child.getAttribute('disabled')).toBe('');
    });

    it('parses unquoted attributes', () => {
      // href value is testing that the slash isn't interpreted as a self-closing tag
      ctx.scratch.innerHTML = '<a class=test href=foo/></a>';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child.attributes).toHaveLength(2);
      expect(child.attributes.item(0)).toEqual(
        expect.objectContaining({name: 'class', value: 'test'}),
      );
      expect(child.attributes.item(1)).toEqual(
        expect.objectContaining({name: 'href', value: 'foo/'}),
      );
    });

    it('closes unclosed tags', () => {
      ctx.scratch.innerHTML = '<a href="foo">foo';
      expect(ctx.scratch.childNodes).toHaveLength(1);
      const child = ctx.scratch.firstChild as Element;
      expect(child.attributes).toHaveLength(1);
      expect(child.getAttribute('href')).toBe('foo');
      expect(child.childNodes).toHaveLength(1);
      expect(child.firstChild).toBeInstanceOf(Text);
      expect(child.firstChild).toHaveProperty('data', 'foo');
    });

    // it('closes mismatched tags', () => {
    //   ctx.scratch.innerHTML = '<a><b>foo</a>after';
    //   expect(ctx.scratch.childNodes).toHaveLength(2);
    //   const child = ctx.scratch.firstChild as Element;
    //   expect(child).toHaveProperty('localName', 'a');
    //   expect(child.childNodes).toHaveLength(1);
    //   expect(child.firstChild).toHaveProperty('localName', 'b');
    //   expect(child.firstChild!.childNodes).toHaveLength(1);
    //   expect(child.firstChild!.firstChild).toHaveProperty('data', 'foo');
    //   expect(ctx.scratch.lastChild).toHaveProperty('data', 'after');
    // });
  });

  describe('textContent', () => {
    describe('get', () => {
      it('returns the text content of the node', () => {
        ctx.scratch.append('some text');
        expect(ctx.scratch.textContent).toBe('some text');
      });

      it('returns the text content including descendants', () => {
        const span = ctx.document.createElement('span');
        span.append('content');
        ctx.scratch.append('before', span, 'after');
        expect(ctx.scratch.textContent).toBe('beforecontentafter');
      });
    });

    describe('set', () => {
      it('inserts a Text node when called on empty element', () => {
        ctx.scratch.textContent = 'some text';
        expect(ctx.scratch.childNodes).toHaveLength(1);
        expect(ctx.scratch.childNodes[0]).toBeInstanceOf(Text);
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'some text');
      });

      it('replaces children when called on non-empty element', () => {
        ctx.scratch.append(
          ctx.document.createElement('span'),
          ctx.document.createElement('div'),
        );
        ctx.scratch.textContent = 'some text';
        expect(ctx.scratch.childNodes).toHaveLength(1);
        expect(ctx.scratch.children).toHaveLength(0);
        expect(ctx.scratch.childNodes[0]).toBeInstanceOf(Text);
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'some text');
      });

      it('does not decode entities', () => {
        ctx.scratch.textContent = 'foo&amp;bar';
        expect(ctx.scratch.childNodes[0]).toHaveProperty('data', 'foo&amp;bar');
      });
    });
  });
});

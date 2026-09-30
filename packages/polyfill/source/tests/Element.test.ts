import {beforeEach, describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../constants.ts';
import {Element} from '../Element.ts';
import {Window} from '../Window.ts';

describe('Element convenience APIs', () => {
  let window: Window;
  let element: Element;
  const hooks = {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  };

  beforeEach(() => {
    window = new Window();
    window[HOOKS] = hooks;
    element = window.document.createElement('div');
    hooks.setAttribute.mockClear();
    hooks.removeAttribute.mockClear();
  });

  describe('matches and closest', () => {
    it('finds itself and the nearest matching ancestor', () => {
      const outer = window.document.createElement('section');
      const middle = window.document.createElement('div');
      outer.className = 'container';
      middle.className = 'container middle';
      element.className = 'target';
      outer.append(middle);
      middle.append(element);
      window.document.body.append(outer);

      expect(element.closest('.target')).toBe(element);
      expect(element.closest('.container')).toBe(middle);
      expect(element.closest('section > .middle')).toBe(middle);
      expect(element.closest('div.middle:has(> .target)')).toBe(middle);
      expect(element.closest('section:has(> .middle .target)')).toBe(outer);
      expect(element.closest('body')).toBe(window.document.body);
    });

    it('matches current complex and relative selectors', () => {
      const article = window.document.createElement('article');
      const section = window.document.createElement('section');
      article.className = 'post';
      section.className = 'content';
      element.className = 'target';
      article.append(section);
      section.append(element);

      expect(element.matches('article.post > .content > .target')).toBe(true);
      expect(element.matches('article:has(> .content .target) .target')).toBe(
        true,
      );
      expect(article.matches('article.post:has(> .content .target)')).toBe(
        true,
      );
      expect(article.matches('article:has(+ aside)')).toBe(false);
    });

    it('returns null when neither the element nor its ancestors match', () => {
      expect(element.closest('.missing')).toBeNull();
    });

    it.each([':hover', 'div >', ':has(:has(.target))'])(
      'throws SyntaxError for invalid selector %s',
      (selector) => {
        expect(() => element.matches(selector)).toThrowError(
          expect.objectContaining({name: 'SyntaxError'}),
        );
        expect(() => element.closest(selector)).toThrowError(
          expect.objectContaining({name: 'SyntaxError'}),
        );
      },
    );
  });

  describe('classList', () => {
    it('stays in sync with className and the normalized class attribute', () => {
      const classes = element.classList;
      element.setAttribute('CLASS', 'one two');

      expect(element.getAttributeNames()).toEqual(['class']);

      expect(element.classList).toBe(classes);
      expect(Array.isArray(classes)).toBe(false);
      expect([...classes]).toEqual(['one', 'two']);
      expect(classes.length).toBe(2);
      expect(classes[0]).toBe('one');
      expect(classes[1]).toBe('two');
      expect(classes[2]).toBeUndefined();
      expect(classes.item(0)).toBe('one');
      expect(classes.item(2)).toBeNull();
      expect(classes.contains('two')).toBe(true);
      expect(classes.value).toBe('one two');
      expect(String(classes)).toBe('one two');

      element.className = 'three';
      expect(element.getAttribute('class')).toBe('three');
      expect(classes[0]).toBe('three');
      expect(classes[1]).toBeUndefined();
      expect([...classes]).toEqual(['three']);
    });

    it('returns ordered unique tokens split on ASCII whitespace without rewriting the attribute', () => {
      const value = ' one\tone\ntwo\ftwo\rthree three  four four ';
      element.className = value;
      hooks.setAttribute.mockClear();

      const classes = element.classList;

      expect([...classes]).toEqual(['one', 'two', 'three', 'four']);
      expect(classes.length).toBe(4);
      expect(classes[0]).toBe('one');
      expect(classes[3]).toBe('four');
      expect(classes[4]).toBeUndefined();
      expect(classes.item(0)).toBe('one');
      expect(classes.item(3)).toBe('four');
      expect(classes.item(4)).toBeNull();
      expect(classes.value).toBe(value);
      expect(element.getAttribute('class')).toBe(value);
      expect(hooks.setAttribute).not.toHaveBeenCalled();
    });

    it('preserves non-ASCII whitespace in tokens during reads and mutations', () => {
      const tokens = [
        'a\u00a0b',
        '\u00a0leading',
        'trailing\u2003',
        'inside\u2003token',
      ];
      const value = tokens.join(' ');
      element.className = value;
      hooks.setAttribute.mockClear();

      expect([...element.classList]).toEqual(tokens);
      for (const token of tokens) {
        expect(element.classList.contains(token)).toBe(true);
      }
      expect(hooks.setAttribute).not.toHaveBeenCalled();

      element.classList.add('added');
      expect(element.className).toBe(`${value} added`);
      expect(hooks.setAttribute).toHaveBeenLastCalledWith(
        element,
        'class',
        `${value} added`,
        null,
      );

      element.classList.remove('added');
      expect(element.className).toBe(value);
      expect([...element.classList]).toEqual(tokens);
      expect(hooks.setAttribute).toHaveBeenLastCalledWith(
        element,
        'class',
        value,
        null,
      );
    });

    it('ignores indexed assignment', () => {
      element.className = 'one two';

      (element.classList as any)[1] = 'three';

      expect(element.classList[1]).toBe('two');
      expect(element.className).toBe('one two');
    });

    it('adds, removes, and replaces classes through attribute hooks', () => {
      element.className = 'one one two';
      hooks.setAttribute.mockClear();

      element.classList.add('two', 'three');
      expect(element.className).toBe('one two three');
      expect(hooks.setAttribute).toHaveBeenLastCalledWith(
        element,
        'class',
        'one two three',
        null,
      );

      element.classList.remove('one', 'missing');
      expect(element.className).toBe('two three');
      expect(element.classList.replace('three', 'four')).toBe(true);
      expect(element.classList.replace('missing', 'five')).toBe(false);
      expect(element.className).toBe('two four');
    });

    it('toggles classes, including with an explicit force', () => {
      expect(element.classList.toggle('active')).toBe(true);
      expect(element.classList.contains('active')).toBe(true);
      expect(element.classList.toggle('active')).toBe(false);
      expect(element.classList.toggle('active', false)).toBe(false);
      expect(element.classList.toggle('active', true)).toBe(true);
      expect(element.className).toBe('active');
    });

    it.each(['add', 'remove', 'toggle', 'replace'] as const)(
      '%s rejects empty tokens and tokens containing ASCII whitespace',
      (method) => {
        element.className = 'existing';
        hooks.setAttribute.mockClear();
        hooks.removeAttribute.mockClear();

        const mutate = (token: string) => {
          switch (method) {
            case 'add':
              return element.classList.add(token);
            case 'remove':
              return element.classList.remove(token);
            case 'toggle':
              return element.classList.toggle(token);
            case 'replace':
              return element.classList.replace(token, 'replacement');
          }
        };

        expect(() => mutate('')).toThrowError(
          expect.objectContaining({name: 'SyntaxError'}),
        );
        expect(() => mutate('invalid\ttoken')).toThrowError(
          expect.objectContaining({name: 'InvalidCharacterError'}),
        );
        expect(element.className).toBe('existing');
        expect(element.classList.contains('')).toBe(false);
        expect(hooks.setAttribute).not.toHaveBeenCalled();
        expect(hooks.removeAttribute).not.toHaveBeenCalled();
      },
    );

    it.each(['\t', '\n', '\f', '\r', ' '])(
      'rejects the ASCII whitespace character %j in tokens',
      (whitespace) => {
        expect(() => element.classList.add(`one${whitespace}two`)).toThrowError(
          expect.objectContaining({name: 'InvalidCharacterError'}),
        );
      },
    );

    it.each(['add', 'remove'] as const)(
      '%s validates all arguments before changing the class attribute',
      (method) => {
        element.className = 'one two';
        hooks.setAttribute.mockClear();

        expect(() => element.classList[method]('one', 'invalid token')).toThrow(
          expect.objectContaining({name: 'InvalidCharacterError'}),
        );
        expect(element.className).toBe('one two');
        expect(hooks.setAttribute).not.toHaveBeenCalled();
      },
    );

    it.each(['add', 'remove', 'replace'] as const)(
      '%s converts later arguments before validating an earlier token',
      (method) => {
        element.className = 'existing';
        hooks.setAttribute.mockClear();
        const conversions = [0, 0];
        const conversionError = new Error('later conversion failed');
        const invalidToken = {
          toString() {
            conversions[0]! += 1;
            return '';
          },
        };
        const laterToken = {
          toString() {
            conversions[1]! += 1;
            throw conversionError;
          },
        };

        expect(() => {
          if (method === 'replace') {
            element.classList.replace(invalidToken as any, laterToken as any);
          } else {
            element.classList[method](invalidToken as any, laterToken as any);
          }
        }).toThrowError(conversionError);
        expect(conversions).toEqual([1, 1]);
        expect(element.className).toBe('existing');
        expect(hooks.setAttribute).not.toHaveBeenCalled();
      },
    );

    it('prioritizes empty-token errors across replace arguments only', () => {
      expect(() => element.classList.replace('invalid token', '')).toThrowError(
        expect.objectContaining({name: 'SyntaxError'}),
      );

      for (const method of ['add', 'remove'] as const) {
        expect(() =>
          element.classList[method]('invalid token', ''),
        ).toThrowError(
          expect.objectContaining({name: 'InvalidCharacterError'}),
        );
      }
    });

    it('validates the replacement even when the old token is absent', () => {
      element.className = 'existing';
      hooks.setAttribute.mockClear();

      expect(() =>
        element.classList.replace('missing', 'invalid token'),
      ).toThrowError(expect.objectContaining({name: 'InvalidCharacterError'}));
      expect(element.className).toBe('existing');
      expect(hooks.setAttribute).not.toHaveBeenCalled();
    });

    it('validates toggle tokens when force would prevent a mutation', () => {
      element.className = 'existing';
      hooks.setAttribute.mockClear();

      expect(() =>
        element.classList.toggle('invalid token', false),
      ).toThrowError(expect.objectContaining({name: 'InvalidCharacterError'}));
      expect(element.className).toBe('existing');
      expect(hooks.setAttribute).not.toHaveBeenCalled();
    });

    it('allows non-ASCII whitespace tokens in every mutation method', () => {
      const first = 'one\u00a0two';
      const second = 'three\u2003four';
      const replacement = 'five\u202fsix';

      element.classList.add(first);
      expect(element.classList.toggle(second)).toBe(true);
      expect(element.classList.replace(first, replacement)).toBe(true);
      element.classList.remove(second);

      expect([...element.classList]).toEqual([replacement]);
    });

    it('coerces each token argument to a string exactly once', () => {
      const conversions = [0, 0];
      const tokens = conversions.map((_, index) => ({
        toString() {
          conversions[index]! += 1;
          return index === 0 ? 'missing' : 'replacement';
        },
      }));

      expect(
        element.classList.replace(tokens[0] as any, tokens[1] as any),
      ).toBe(false);
      expect(conversions).toEqual([1, 1]);
    });
  });

  describe('dataset', () => {
    it('returns the same live object on every access', () => {
      const dataset = element.dataset;
      expect(element.dataset).toBe(dataset);

      element.setAttribute('data-state', 'ready');
      expect(dataset.state).toBe('ready');
    });

    it('reads normalized data attributes', () => {
      element.setAttribute('DATA-USER-ID', '123');
      element.setAttribute('data-state', 'ready');

      expect(element.getAttributeNames()).toEqual([
        'data-user-id',
        'data-state',
      ]);
      expect(element.dataset.userId).toBe('123');
      expect(element.dataset.state).toBe('ready');
    });

    it('writes and deletes data attributes through attribute hooks', () => {
      (element.dataset as any).itemCount = 2;

      expect(element.getAttribute('data-item-count')).toBe('2');
      expect(hooks.setAttribute).toHaveBeenCalledWith(
        element,
        'data-item-count',
        '2',
        null,
      );

      hooks.removeAttribute.mockClear();
      delete element.dataset.itemCount;
      expect(element.hasAttribute('data-item-count')).toBe(false);
      expect(hooks.removeAttribute).toHaveBeenCalledWith(
        element,
        'data-item-count',
        null,
      );
    });

    it('remains live when data attributes change directly', () => {
      const dataset = element.dataset;
      expect(dataset.status).toBeUndefined();

      element.setAttribute('data-status', 'pending');
      expect(dataset.status).toBe('pending');

      element.removeAttribute('data-status');
      expect(dataset.status).toBeUndefined();
    });

    it('exposes data attributes as enumerable own properties', () => {
      element.setAttribute('data-user-id', '123');
      element.setAttribute('data-state', 'ready');
      element.setAttribute('class', 'not-data');

      expect(Object.keys(element.dataset)).toStrictEqual(['userId', 'state']);
      expect({...element.dataset}).toStrictEqual({
        userId: '123',
        state: 'ready',
      });
      expect('userId' in element.dataset).toBe(true);
      expect('missing' in element.dataset).toBe(false);

      const entries: [string, string | undefined][] = [];
      for (const key in element.dataset) {
        entries.push([key, element.dataset[key]]);
      }
      expect(entries).toStrictEqual([
        ['userId', '123'],
        ['state', 'ready'],
      ]);

      element.removeAttribute('data-user-id');
      expect(Object.keys(element.dataset)).toStrictEqual(['state']);
    });

    it('lets data attributes shadow inherited object members', () => {
      const dataset = element.dataset;
      element.setAttribute('data-constructor', 'widget');
      element.setAttribute('data-to-string', 'custom');

      expect(dataset.constructor).toBe('widget');
      expect(dataset.toString).toBe('custom');
      expect(Object.keys(dataset)).toStrictEqual(['constructor', 'toString']);
      expect({...dataset}).toStrictEqual({
        constructor: 'widget',
        toString: 'custom',
      });
      expect(Object.prototype.hasOwnProperty.call(dataset, 'constructor')).toBe(
        true,
      );
      expect(Object.prototype.hasOwnProperty.call(dataset, 'toString')).toBe(
        true,
      );

      delete (dataset as any).constructor;
      delete (dataset as any).toString;

      expect(typeof dataset.constructor).toBe('function');
      expect(typeof dataset.toString).toBe('function');
      expect(`${dataset}`).toBe('[object Object]');
      expect('constructor' in dataset).toBe(true);
      expect('toString' in dataset).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(dataset, 'constructor')).toBe(
        false,
      );
      expect(Object.prototype.hasOwnProperty.call(dataset, 'toString')).toBe(
        false,
      );
      expect(Object.keys(dataset)).toStrictEqual([]);
    });

    it('routes defineProperty through the data attributes', () => {
      Object.defineProperty(element.dataset, 'itemCount', {value: 2});

      expect(element.getAttribute('data-item-count')).toBe('2');
      expect(Object.keys(element.dataset)).toStrictEqual(['itemCount']);
      expect({...element.dataset}).toStrictEqual({itemCount: '2'});

      expect(() =>
        Object.defineProperty(element.dataset, 'bad', {get: () => 'x'}),
      ).toThrow(TypeError);
      expect(Object.keys(element.dataset)).toStrictEqual(['itemCount']);
    });

    it('refuses preventExtensions like a legacy platform object', () => {
      element.setAttribute('data-state', 'ready');

      expect(() => Object.preventExtensions(element.dataset)).toThrow(
        TypeError,
      );
      expect(() => Object.freeze(element.dataset)).toThrow(TypeError);
      expect(Object.isExtensible(element.dataset)).toBe(true);

      element.dataset.after = 'still-works';
      expect(element.getAttribute('data-after')).toBe('still-works');
      expect(Object.keys(element.dataset)).toStrictEqual(['state', 'after']);
    });

    it('does not alias invalid dashed property names to data attributes', () => {
      const dataset = element.dataset;
      element.setAttribute('data-foo-bar', 'original');
      hooks.setAttribute.mockClear();
      hooks.removeAttribute.mockClear();

      expect(dataset.fooBar).toBe('original');
      expect(dataset['foo-bar']).toBeUndefined();
      expect('foo-bar' in dataset).toBe(false);
      expect(
        Object.getOwnPropertyDescriptor(dataset, 'foo-bar'),
      ).toBeUndefined();
      expect(Object.hasOwn(dataset, 'foo-bar')).toBe(false);

      expect(delete dataset['foo-bar']).toBe(true);
      expect(element.getAttribute('data-foo-bar')).toBe('original');
      expect(hooks.removeAttribute).not.toHaveBeenCalled();

      expect(() => {
        dataset['foo-bar'] = 'changed';
      }).toThrowError(expect.objectContaining({name: 'SyntaxError'}));
      expect(() =>
        Object.defineProperty(dataset, 'foo-bar', {value: 'changed'}),
      ).toThrowError(expect.objectContaining({name: 'SyntaxError'}));
      expect(() =>
        Object.defineProperty(dataset, 'foo-bar', {get: () => 'changed'}),
      ).toThrow(TypeError);

      expect(element.getAttribute('data-foo-bar')).toBe('original');
      expect(hooks.setAttribute).not.toHaveBeenCalled();
      expect(hooks.removeAttribute).not.toHaveBeenCalled();
    });

    it('supports valid dashed property names that are not followed by lowercase ASCII', () => {
      const dataset = element.dataset;
      dataset['foo-9'] = 'number';
      dataset['foo-Bar'] = 'uppercase';
      dataset['trailing-'] = 'trailing';

      expect(element.getAttribute('data-foo-9')).toBe('number');
      expect(element.getAttribute('data-foo--bar')).toBe('uppercase');
      expect(element.getAttribute('data-trailing-')).toBe('trailing');
      expect(Object.keys(dataset)).toStrictEqual([
        'foo-9',
        'foo-Bar',
        'trailing-',
      ]);
      expect(hooks.setAttribute).toHaveBeenNthCalledWith(
        1,
        element,
        'data-foo-9',
        'number',
        null,
      );
      expect(hooks.setAttribute).toHaveBeenNthCalledWith(
        2,
        element,
        'data-foo--bar',
        'uppercase',
        null,
      );
      expect(hooks.setAttribute).toHaveBeenNthCalledWith(
        3,
        element,
        'data-trailing-',
        'trailing',
        null,
      );
    });

    it('only lowercases ASCII uppercase letters in dataset conversions', () => {
      element.setAttribute('data-Ä', 'uppercase');
      element.setAttribute('data-ä', 'lowercase');

      expect(element.dataset['Ä']).toBe('uppercase');
      expect(element.dataset['ä']).toBe('lowercase');
      expect(Object.keys(element.dataset)).toStrictEqual(['Ä', 'ä']);
      expect({...element.dataset}).toStrictEqual({
        Ä: 'uppercase',
        ä: 'lowercase',
      });

      element.dataset['Ä'] = 'updated';
      expect(element.getAttribute('data-Ä')).toBe('updated');
      expect(element.getAttribute('data-ä')).toBe('lowercase');
    });

    it('leaves symbol properties on the dataset proxy unchanged', () => {
      const symbol = Symbol('custom');
      const dataset = element.dataset as any;

      dataset[symbol] = 'value';
      expect(dataset[symbol]).toBe('value');
      expect(symbol in dataset).toBe(true);
      expect(Object.getOwnPropertyDescriptor(dataset, symbol)).toEqual({
        value: 'value',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      expect(Reflect.ownKeys(dataset)).toContain(symbol);

      expect(delete dataset[symbol]).toBe(true);
      expect(symbol in dataset).toBe(false);
    });

    it('hides data attributes whose names do not round-trip to a property', () => {
      const element = window.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g',
      );
      element.setAttribute('data-fooBar', 'shadowed');
      element.setAttribute('data-foo-bar', 'visible');

      expect(element.getAttributeNames()).toEqual([
        'data-fooBar',
        'data-foo-bar',
      ]);
      expect(Object.keys(element.dataset)).toStrictEqual(['fooBar']);
      expect({...element.dataset}).toStrictEqual({fooBar: 'visible'});
      expect(element.dataset.fooBar).toBe('visible');

      element.removeAttribute('data-foo-bar');
      expect(Object.keys(element.dataset)).toStrictEqual([]);
      expect(element.dataset.fooBar).toBeUndefined();
    });

    it('reflects normalized HTML data attribute names', () => {
      element.setAttribute('data-fooBar', 'normalized');
      element.setAttribute('data-foo-bar', 'visible');

      expect(element.getAttributeNames()).toEqual([
        'data-foobar',
        'data-foo-bar',
      ]);
      expect(Object.keys(element.dataset)).toStrictEqual(['foobar', 'fooBar']);
      expect({...element.dataset}).toStrictEqual({
        foobar: 'normalized',
        fooBar: 'visible',
      });

      element.removeAttribute('DATA-FOO-BAR');
      expect(Object.keys(element.dataset)).toStrictEqual(['foobar']);
      expect(element.dataset.fooBar).toBeUndefined();
      expect(element.dataset.foobar).toBe('normalized');
    });
  });
});

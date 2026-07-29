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

  describe('closest', () => {
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
      expect(element.closest('body')).toBe(window.document.body);
    });

    it('returns null when neither the element nor its ancestors match', () => {
      expect(element.closest('.missing')).toBeNull();
    });
  });

  describe('classList', () => {
    it('stays in sync with className and the class attribute', () => {
      const classes = element.classList;
      element.setAttribute('class', 'one two');

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

    it('does not allow indexed assignment', () => {
      element.className = 'one two';

      expect(() => {
        (element.classList as any)[1] = 'three';
      }).toThrow(TypeError);
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
  });

  describe('dataset', () => {
    it('returns the same live object on every access', () => {
      const dataset = element.dataset;
      expect(element.dataset).toBe(dataset);

      element.setAttribute('data-state', 'ready');
      expect(dataset.state).toBe('ready');
    });

    it('reads data attributes', () => {
      element.setAttribute('data-user-id', '123');
      element.setAttribute('data-state', 'ready');

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
  });
});

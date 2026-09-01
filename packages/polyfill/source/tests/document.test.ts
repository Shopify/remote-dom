import {Window} from '../index.ts';

import {beforeEach, describe, expect, it} from 'vitest';

beforeEach(() => {
  const window = new Window();
  Window.setGlobalThis(window);
});

describe('NonElementParentNode.getElementById', () => {
  describe('Document', () => {
    it('returns the first matching element in tree order after arbitrary insertions', () => {
      const container = document.createElement('div');
      const createTarget = () => {
        const element = document.createElement('span');
        element.id = 'target';
        return element;
      };
      const first = createTarget();
      const second = createTarget();
      const third = createTarget();
      const fourth = createTarget();

      container.appendChild(second);
      container.appendChild(fourth);
      container.insertBefore(third, fourth);
      container.insertBefore(first, second);
      document.body.appendChild(container);

      for (const element of [first, second, third, fourth]) {
        expect(document.getElementById('target')).toBe(element);
        element.remove();
      }

      expect(document.getElementById('target')).toBeNull();
    });

    it('only returns elements connected to the document', () => {
      const container = document.createElement('div');
      const target = document.createElement('span');
      target.id = 'target';
      container.appendChild(target);

      expect(document.getElementById('target')).toBeNull();

      document.body.appendChild(container);
      expect(document.getElementById('target')).toBe(target);

      container.remove();
      expect(document.getElementById('target')).toBeNull();
    });

    it('reflects id property and attribute changes immediately', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      target.id = 'before';
      expect(target.getAttribute('id')).toBe('before');
      expect(document.getElementById('before')).toBe(target);

      target.setAttribute('id', 'after');
      expect(target.id).toBe('after');
      expect(document.getElementById('before')).toBeNull();
      expect(document.getElementById('after')).toBe(target);

      target.removeAttribute('id');
      expect(target.id).toBe('');
      expect(document.getElementById('after')).toBeNull();
    });

    it('coerces identifiers to strings but never matches an empty id', () => {
      document.body.innerHTML = `
        <div id=""></div>
        <div id="null"></div>
        <div id="undefined"></div>
      `;

      expect(document.getElementById('')).toBeNull();
      expect(document.getElementById(null as any)?.id).toBe('null');
      expect(document.getElementById(undefined as any)?.id).toBe('undefined');
    });

    it('matches identifiers literally instead of parsing them as selectors', () => {
      const ids = ['a.b', 'a b', 'a[b]', 'a:b', 'a#b'];

      for (const id of ids) {
        const element = document.createElement('div');
        element.id = id;
        document.body.appendChild(element);
      }

      for (const id of ids) {
        expect(document.getElementById(id)?.id).toBe(id);
      }
    });
  });

  describe('DocumentFragment', () => {
    it('finds the first matching element within the fragment', () => {
      const fragment = document.createDocumentFragment();
      const first = document.createElement('div');
      const second = document.createElement('div');
      first.id = 'target';
      second.id = 'target';
      fragment.append(first, second);

      expect(fragment.getElementById('target')).toBe(first);
      expect(fragment.getElementById('missing')).toBeNull();
    });

    it('does not find elements outside the fragment', () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const fragment = document.createDocumentFragment();

      expect(fragment.getElementById('target')).toBeNull();
      expect((target as any).getElementById).toBeUndefined();
    });
  });
});

import {CustomElementRegistryImplementation} from '../CustomElementRegistry.ts';
import {Window} from '../Window.ts';

import {beforeEach, describe, expect, it, vi} from 'vitest';

beforeEach(() => {
  Window.setGlobalThis(new Window());
});

describe('CustomElementRegistry', () => {
  describe('define()', () => {
    it.each([
      'my-element',
      'x-',
      'ui-4.x_thing',
      'math-α',
      'icon-💡',
      'my-💡!',
      'my-\u{F0000}',
    ])('defines an element with the valid name %s', (name) => {
      const registry = new CustomElementRegistryImplementation();
      class CustomElement extends HTMLElement {}

      registry.define(name, CustomElement);

      expect(registry.get(name)).toBe(CustomElement);
    });

    it.each([
      '',
      'element',
      'My-element',
      '1-element',
      '-element',
      'my element',
      'my- element',
      'my-\telement',
      'my-\nelement',
      'my-\felement',
      'my-\relement',
      'my-\0element',
      'my-/element',
      'my->element',
      'my-Element',
      'é-element',
      'annotation-xml',
      'color-profile',
      'font-face',
      'font-face-src',
      'font-face-uri',
      'font-face-format',
      'font-face-name',
      'missing-glyph',
    ])('rejects the invalid name %j with a SyntaxError', (name) => {
      const registry = new CustomElementRegistryImplementation();
      class CustomElement extends HTMLElement {}

      expect(() => registry.define(name, CustomElement)).toThrowError(
        DOMException,
      );
      expect(() => registry.define(name, CustomElement)).toThrowError(
        expect.objectContaining({name: 'SyntaxError'}),
      );
      expect(registry.get(name)).toBeUndefined();
    });

    it('rejects duplicate names and preserves the original definition', () => {
      const registry = new CustomElementRegistryImplementation();
      class OriginalElement extends HTMLElement {}
      class ReplacementElement extends HTMLElement {}

      registry.define('original-element', OriginalElement);

      expect(() =>
        registry.define('original-element', ReplacementElement),
      ).toThrowError(DOMException);
      expect(() =>
        registry.define('original-element', ReplacementElement),
      ).toThrowError(expect.objectContaining({name: 'NotSupportedError'}));
      expect(registry.get('original-element')).toBe(OriginalElement);
      expect(registry.getName(ReplacementElement)).toBeNull();
    });

    it('rejects duplicate constructors and preserves the original definition', () => {
      const registry = new CustomElementRegistryImplementation();
      class CustomElement extends HTMLElement {}

      registry.define('original-element', CustomElement);

      expect(() =>
        registry.define('replacement-element', CustomElement),
      ).toThrowError(DOMException);
      expect(() =>
        registry.define('replacement-element', CustomElement),
      ).toThrowError(expect.objectContaining({name: 'NotSupportedError'}));
      expect(registry.get('replacement-element')).toBeUndefined();
      expect(registry.getName(CustomElement)).toBe('original-element');
    });

    it('notifies whenDefined() listeners only after a successful definition', async () => {
      const registry = new CustomElementRegistryImplementation();
      class OriginalElement extends HTMLElement {}
      class ReplacementElement extends HTMLElement {}
      const listener = vi.fn();
      const definition = registry
        .whenDefined('replacement-element')
        .then(listener);

      registry.define('original-element', OriginalElement);
      expect(() =>
        registry.define('replacement-element', OriginalElement),
      ).toThrowError(expect.objectContaining({name: 'NotSupportedError'}));

      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();

      registry.define('replacement-element', ReplacementElement);
      await definition;
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(ReplacementElement);
    });
  });
});

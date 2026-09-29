import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {Window} from '../index.ts';

let window: Window;
let document: Window['document'];

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
  document = window.document;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Document cloning and importing', () => {
  it.each([false, true])(
    'rejects cloneNode(%s) with a named, clear error',
    (deep) => {
      const clone = () => document.cloneNode(deep);

      expect(clone).toThrowError(DOMException);
      expect(clone).toThrowError(
        expect.objectContaining({
          name: 'NotSupportedError',
          message: 'Cannot clone a document node',
        }),
      );
    },
  );

  it.each([false, true])(
    'rejects importNode(document, %s) with a named, clear error',
    (deep) => {
      const destination = new Window().document;
      const importDocument = () => destination.importNode(document, deep);

      expect(importDocument).toThrowError(DOMException);
      expect(importDocument).toThrowError(
        expect.objectContaining({
          name: 'NotSupportedError',
          message: 'Cannot import a document node',
        }),
      );
    },
  );

  it('continues to clone and import supported document descendants', () => {
    document.body.append('content');
    const destination = new Window().document;

    const clone = document.documentElement.cloneNode(true);
    const imported = destination.importNode(document.documentElement, true);

    expect(clone.textContent).toBe('content');
    expect(clone.ownerDocument).toBe(document);
    expect(imported.textContent).toBe('content');
    expect(imported.ownerDocument).toBe(destination);
  });

  it('preserves the named error when DOMException is unavailable', () => {
    vi.stubGlobal('DOMException', undefined);
    const destination = new Window().document;

    for (const operation of [
      () => document.cloneNode(),
      () => destination.importNode(document),
    ]) {
      expect(operation).toThrowError(Error);
      expect(operation).toThrowError(
        expect.objectContaining({name: 'NotSupportedError'}),
      );
    }
  });
});

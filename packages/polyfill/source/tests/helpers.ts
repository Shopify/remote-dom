import {beforeAll, beforeEach, afterEach, vi, type Mock} from 'vitest';
import {HOOKS} from '../constants';
import {Window} from '../Window';
import type {Element} from '../Element';
import type {Document} from '../Document';
import type {Hooks} from '../hooks';

export function setupScratch() {
  let window!: Window;
  let document!: Document;
  let scratch!: Element;
  const hooks = {
    insertChild: vi.fn(),
    createElement: vi.fn(),
    createText: vi.fn(),
    removeChild: vi.fn(),
    setText: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  } satisfies {[key in keyof Hooks]: Mock};

  function clearMocks() {
    for (const key in hooks) {
      hooks[key as keyof typeof hooks].mockClear();
    }
  }

  beforeAll(() => {
    window = new Window();
    window[HOOKS] = hooks;
    document = window.document;
  });

  beforeEach(() => {
    scratch = document.createElement('scratch');
    document.body.append(scratch);
    clearMocks();
  });

  afterEach(() => {
    scratch.replaceChildren();
    scratch?.remove();
  });

  return {
    // using getters here is required because things are recreated for each test
    get window() {
      return window;
    },
    get document() {
      return document;
    },
    get scratch() {
      return scratch;
    },
    hooks,
    clearMocks,
  };
}

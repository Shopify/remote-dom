import {HOOKS, Window} from '../index.ts';

import {expect, it} from 'vitest';

function expectCreateTextNodeHookData(data: any, expected: string) {
  const window = new Window();
  Window.setGlobalThis(window);

  let hookText: unknown;
  let hookData: string | undefined;

  window[HOOKS].createText = (text, data) => {
    hookText = text;
    hookData = data;
  };

  const text = document.createTextNode(data);

  expect(text.data).toBe(expected);
  expect(hookText).toBe(text);
  expect(hookData).toBe(text.data);
}

it('normalizes null createTextNode hook data', () => {
  expectCreateTextNodeHookData(null, '');
});

it('normalizes undefined createTextNode hook data', () => {
  expectCreateTextNodeHookData(undefined, '');
});

it('preserves empty createTextNode hook data', () => {
  expectCreateTextNodeHookData('', '');
});

it('preserves ordinary createTextNode hook data', () => {
  expectCreateTextNodeHookData('Hello, world!', 'Hello, world!');
});

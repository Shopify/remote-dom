import {beforeEach, describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../constants.ts';
import {Window} from '../Window.ts';

describe('imperative element methods', () => {
  let window: Window;
  const callMethod = vi.fn();

  beforeEach(() => {
    window = new Window();
    window[HOOKS] = {callMethod};
    callMethod.mockClear();
  });

  it('forwards focus() through the window hook', () => {
    const element = window.document.createElement('div');
    const options = {preventScroll: true};

    element.focus();
    element.focus(options);

    expect(callMethod).toHaveBeenNthCalledWith(1, element, 'focus');
    expect(callMethod).toHaveBeenNthCalledWith(2, element, 'focus', options);
  });

  it('forwards scrollIntoView() through the window hook', () => {
    const element = window.document.createElement('div');
    const options = {behavior: 'smooth'} as const;

    element.scrollIntoView();
    element.scrollIntoView(false);
    element.scrollIntoView(options);

    expect(callMethod).toHaveBeenNthCalledWith(1, element, 'scrollIntoView');
    expect(callMethod).toHaveBeenNthCalledWith(
      2,
      element,
      'scrollIntoView',
      false,
    );
    expect(callMethod).toHaveBeenNthCalledWith(
      3,
      element,
      'scrollIntoView',
      options,
    );
  });

  it('is a no-op when no host method hook is installed', () => {
    const standaloneWindow = new Window();
    const element = standaloneWindow.document.createElement('div');

    expect(() => {
      element.focus();
      element.scrollIntoView();
    }).not.toThrow();
  });
});

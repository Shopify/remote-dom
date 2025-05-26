import {Window} from '../index.ts';

import {describe, it, expect, beforeEach} from 'vitest';

describe('innerHtml', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  it('parses a simple element', () => {
    const element = document.createElement('div');
    element.innerHTML = '<ui-button>Press me!</ui-button>';

    const button = element.querySelector('ui-button');
    expect(button?.textContent).toBe('Press me!');
  });

  it('parses an element with attributes', () => {
    const element = document.createElement('div');
    element.innerHTML = '<ui-button data-id="123">Press me!</ui-button>';

    const button = element.querySelector('ui-button');
    expect(button?.textContent).toBe('Press me!');
    expect(button?.getAttribute('data-id')).toBe('123');
  });

  it('parses an element with attributes on newlines', () => {
    const element = document.createElement('div');
    element.innerHTML = `<ui-button 
      data-id="123"
      data-id2="456"
      data-id3="789"
      data-id4="multiline
content
works too"
variant="primary" tone="neutral"
    >Press me!</ui-button>`;

    const button = element.querySelector('ui-button');

    expect(button?.getAttribute('data-id')).toBe('123');
    expect(button?.getAttribute('data-id2')).toBe('456');
    expect(button?.getAttribute('data-id3')).toBe('789');
    expect(button?.getAttribute('data-id4')).toBe(
      'multiline\ncontent\nworks too',
    );
    expect(button?.getAttribute('variant')).toBe('primary');
    expect(button?.getAttribute('tone')).toBe('neutral');
  });
});

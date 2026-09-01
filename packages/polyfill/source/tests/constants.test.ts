import {describe, expect, it} from 'vitest';

import {Window} from '../index.ts';

describe('DOM constants', () => {
  it('exposes standard event phase constants', () => {
    const {Event} = new Window();

    expect(Event.NONE).toBe(0);
    expect(Event.CAPTURING_PHASE).toBe(1);
    expect(Event.AT_TARGET).toBe(2);
    expect(Event.BUBBLING_PHASE).toBe(3);
  });

  it('initializes the event type', () => {
    const {Event} = new Window();
    const event = new Event('click');

    expect(event.type).toBe('click');
  });

  it('uses standard node type values', () => {
    const {document} = new Window();
    const element = document.createElement('div');
    element.setAttribute('example', 'value');

    expect(element.nodeType).toBe(1);
    expect(element.attributes.item(0)?.nodeType).toBe(2);
    expect(document.createTextNode('').nodeType).toBe(3);
    expect(document.createComment('').nodeType).toBe(8);
    expect(document.nodeType).toBe(9);
    expect(document.createDocumentFragment().nodeType).toBe(11);
  });

  it('uses standard namespace values', () => {
    const {document} = new Window();

    expect(document.createElement('div').namespaceURI).toBe(
      'http://www.w3.org/1999/xhtml',
    );
    expect(
      document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        .namespaceURI,
    ).toBe('http://www.w3.org/2000/svg');
  });
});

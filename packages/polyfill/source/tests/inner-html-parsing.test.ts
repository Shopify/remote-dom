import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../index.ts';

describe('innerHTML parsing', () => {
  beforeEach(() => {
    const window = new Window();
    Window.setGlobalThis(window);
  });

  it('preserves literal ampersands in text', () => {
    const element = document.createElement('div');

    element.innerHTML = '<p>Fish & chips</p>';

    expect(element.textContent).toBe('Fish & chips');
    expect(element.innerHTML).toBe('<p>Fish &amp; chips</p>');
  });

  it('decodes supported named and numeric character references in text', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<p>&amp;&quot;&apos;&lt;&gt;&#38;&#x26;&#128512;&#x1F600;</p>';

    expect(element.textContent).toBe(`&"'<>&&😀😀`);
  });

  it('decodes character references in attributes without double-escaping', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<a title="A &amp; B &#38; C &#x26; D &quot;quoted&quot;"></a>';

    expect(element.firstElementChild?.getAttribute('title')).toBe(
      'A & B & C & D "quoted"',
    );
    expect(element.innerHTML).toBe(
      '<a title="A &amp; B &amp; C &amp; D &quot;quoted&quot;"></a>',
    );
  });

  it('continues parsing when an attribute callback parses nested HTML', () => {
    const nested = document.createElement('div');
    let callbackCount = 0;

    class ReentrantElement extends HTMLElement {
      static observedAttributes = ['data-first', 'data-second'];

      attributeChangedCallback() {
        callbackCount += 1;
        nested.innerHTML =
          '<section data-nested="yes">Nested &amp; safe</section><br>';
      }
    }

    customElements.define('reentrant-element', ReentrantElement);

    const element = document.createElement('div');
    element.innerHTML =
      '<reentrant-element data-first="one" data-second="two">first</reentrant-element><p title="t">two &amp; three</p><br>';

    const reentrant = element.children[0];
    expect(callbackCount).toBe(2);
    expect(reentrant?.getAttribute('data-first')).toBe('one');
    expect(reentrant?.getAttribute('data-second')).toBe('two');
    expect(reentrant?.textContent).toBe('first');
    expect(element.children).toHaveLength(3);
    expect(element.children[1]?.localName).toBe('p');
    expect(element.children[1]?.getAttribute('title')).toBe('t');
    expect(element.children[1]?.textContent).toBe('two & three');
    expect(element.children[2]?.localName).toBe('br');
    expect(nested.innerHTML).toBe(
      '<section data-nested="yes">Nested &amp; safe</section><br>',
    );
  });

  it('keeps content after void elements as siblings', () => {
    const element = document.createElement('div');

    element.innerHTML = '<img src="logo.png"><p>After</p>';

    expect(element.children).toHaveLength(2);
    expect(element.children[0]?.localName).toBe('img');
    expect(element.children[1]?.localName).toBe('p');
    expect(element.children[1]?.textContent).toBe('After');
    expect(element.innerHTML).toBe('<img src="logo.png"><p>After</p>');
  });

  it('parses self-closing syntax for void elements', () => {
    const element = document.createElement('div');

    element.innerHTML = '<br /><img src="logo.png" />';

    expect(element.children[0]?.getAttributeNames()).toEqual([]);
    expect(element.children[1]?.getAttributeNames()).toEqual(['src']);
    expect(element.innerHTML).toBe('<br><img src="logo.png">');
  });

  it('omits closing tags for every HTML void element', () => {
    const element = document.createElement('div');
    const html =
      '<area><base><br><col><embed><hr><img><input><link><meta><param><source><track><wbr>';

    element.innerHTML = html;

    expect(element.children).toHaveLength(14);
    expect(element.innerHTML).toBe(html);
  });
});

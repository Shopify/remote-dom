import {beforeEach, describe, expect, it} from 'vitest';

import {HTML_NAMESPACE, SVG_NAMESPACE} from '../constants.ts';
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

  it('ignores unmatched closing tags without changing the open element', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<section><span>Before</wrong><b>After</b></span></section>';

    const section = element.firstElementChild!;
    const span = section.firstElementChild!;
    expect(span.children).toHaveLength(1);
    expect(span.firstElementChild?.localName).toBe('b');
    expect(element.innerHTML).toBe(
      '<section><span>Before<b>After</b></span></section>',
    );
  });

  it('closes intervening elements when an ancestor closing tag matches', () => {
    const element = document.createElement('div');

    element.innerHTML = '<section><span>Before</section><p>After</p>';

    expect(element.children).toHaveLength(2);
    expect(element.children[0]?.innerHTML).toBe('<span>Before</span>');
    expect(element.children[1]?.localName).toBe('p');
  });

  it('creates parsed SVG elements in the SVG namespace', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<svg><g><circle r="1"/><rect></rect></g></svg><p>After</p>';

    const svg = element.children[0]!;
    const group = svg.firstElementChild!;
    const circle = group.children[0]!;
    const rect = group.children[1]!;
    expect(
      [svg, group, circle, rect].map(({namespaceURI}) => namespaceURI),
    ).toEqual([SVG_NAMESPACE, SVG_NAMESPACE, SVG_NAMESPACE, SVG_NAMESPACE]);
    expect(svg).toBeInstanceOf(SVGElement);
    expect(circle.getAttribute('r')).toBe('1');
    expect(element.children[1]?.namespaceURI).toBe(HTML_NAMESPACE);
    expect(element.innerHTML).toBe(
      '<svg><g><circle r="1"></circle><rect></rect></g></svg><p>After</p>',
    );
  });

  it('preserves parsed SVG names and inherits the SVG context namespace', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    svg.innerHTML = '<linearGradient><stop/></linearGradient>';

    const gradient = svg.firstElementChild!;
    expect(gradient.localName).toBe('linearGradient');
    expect(gradient.namespaceURI).toBe(SVG_NAMESPACE);
    expect(gradient.firstElementChild?.namespaceURI).toBe(SVG_NAMESPACE);
    expect(svg.innerHTML).toBe(
      '<linearGradient><stop></stop></linearGradient>',
    );
  });

  it('switches to HTML inside foreignObject and back to SVG for nested SVG', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<svg><foreignObject><div></div><svg><circle/></svg><p></p></foreignObject><path/></svg>';

    const svg = element.firstElementChild!;
    const foreignObject = svg.children[0]!;
    const htmlDiv = foreignObject.children[0]!;
    const nestedSvg = foreignObject.children[1]!;
    const htmlParagraph = foreignObject.children[2]!;
    const path = svg.children[1]!;
    expect(foreignObject.namespaceURI).toBe(SVG_NAMESPACE);
    expect(htmlDiv.namespaceURI).toBe(HTML_NAMESPACE);
    expect(nestedSvg.namespaceURI).toBe(SVG_NAMESPACE);
    expect(nestedSvg.firstElementChild?.namespaceURI).toBe(SVG_NAMESPACE);
    expect(htmlParagraph.namespaceURI).toBe(HTML_NAMESPACE);
    expect(path.namespaceURI).toBe(SVG_NAMESPACE);
  });

  it('keeps template insertion targets when ignoring unmatched closing tags', () => {
    const element = document.createElement('div');

    element.innerHTML = '<template><p>a</wrong><b>b</b></template><i>c</i>';

    const template = element.children[0] as HTMLTemplateElement;
    const paragraph = template.content.children[0]!;
    expect(element.children).toHaveLength(2);
    expect(paragraph.localName).toBe('p');
    expect(paragraph.children).toHaveLength(1);
    expect(paragraph.firstElementChild?.localName).toBe('b');
    expect(element.children[1]?.localName).toBe('i');
    expect(element.innerHTML).toBe(
      '<template><p>a<b>b</b></p></template><i>c</i>',
    );
  });

  it('keeps SVG template descendants in the SVG element', () => {
    const element = document.createElement('div');

    element.innerHTML = '<svg><template><circle/></template></svg>';

    const template = element.firstElementChild?.firstElementChild!;
    expect(template.namespaceURI).toBe(SVG_NAMESPACE);
    expect(template.childNodes).toHaveLength(1);
    expect(template.firstElementChild?.localName).toBe('circle');
    expect('content' in template).toBe(false);
  });
});

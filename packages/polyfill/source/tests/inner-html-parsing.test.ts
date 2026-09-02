import {beforeEach, describe, expect, it} from 'vitest';

import {HTML_NAMESPACE, SVG_NAMESPACE} from '../constants.ts';
import {Window} from '../index.ts';

const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

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

  it('preserves unsupported named-reference casing in text', () => {
    const element = document.createElement('div');

    element.innerHTML =
      '<p>&amp; &AMP; &aMp; &apos; &APOS; &gt; &GT; &lt; &LT; &quot; &QUOT;</p>';

    expect(element.textContent).toBe(`& & &aMp; ' &APOS; > > < < " "`);
  });

  it('preserves unsupported named-reference casing in attributes', () => {
    const element = document.createElement('div');

    element.innerHTML = '<p title="&AMP; &aMp; &apos; &APOS;"></p>';

    expect(element.firstElementChild?.getAttribute('title')).toBe(
      `& &aMp; ' &APOS;`,
    );
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

  it.each(['input', 'br', 'source'])(
    'preserves children of foreign-namespace %s elements',
    (name) => {
      const element = document.createElementNS('urn:widget', name);
      element.append('must survive');

      expect(element.outerHTML).toBe(`<${name}>must survive</${name}>`);
    },
  );

  it.each(['INPUT', 'Input'])(
    'preserves children of established HTML-namespace %s elements',
    (name) => {
      const element = document.createElementNS(
        'http://www.w3.org/1999/xhtml',
        name,
      );
      element.append('must survive');

      expect(element.outerHTML).toBe(`<${name}>must survive</${name}>`);
    },
  );

  it('classifies prefixed HTML void elements by local name', () => {
    const element = document.createElementNS(
      'http://www.w3.org/1999/xhtml',
      'h:br',
    );
    element.append('omitted');

    expect(element.outerHTML).toBe('<h:br>');
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

  it.each(['title', 'desc', 'foreignObject', 's:foreignObject'])(
    'switches to HTML inside the SVG %s integration point',
    (name) => {
      let constructions = 0;
      class IntegrationLabel extends HTMLElement {
        constructor() {
          super();
          constructions += 1;
        }
      }
      customElements.define('x-integration-label', IntegrationLabel);
      const context = document.createElementNS(SVG_NAMESPACE, name);

      context.innerHTML = '<x-integration-label></x-integration-label>';

      expect(context.firstElementChild?.namespaceURI).toBe(HTML_NAMESPACE);
      expect(context.firstElementChild).toBeInstanceOf(IntegrationLabel);
      expect(constructions).toBe(1);
    },
  );

  it.each(['mtext', 'mi', 'mo', 'mn', 'ms', 'm:mtext'])(
    'preserves HTML custom elements in non-SVG %s contexts',
    (name) => {
      let constructions = 0;
      class NonSvgIntegrationLabel extends HTMLElement {
        constructor() {
          super();
          constructions += 1;
        }
      }
      customElements.define(
        'x-non-svg-integration-label',
        NonSvgIntegrationLabel,
      );
      const context = document.createElementNS(MATHML_NAMESPACE, name);

      context.innerHTML =
        '<x-non-svg-integration-label></x-non-svg-integration-label>';

      expect(context.firstElementChild?.namespaceURI).toBe(HTML_NAMESPACE);
      expect(context.firstElementChild).toBeInstanceOf(NonSvgIntegrationLabel);
      expect(constructions).toBe(1);
    },
  );

  it('switches parsed SVG title and desc descendants to HTML', () => {
    const element = document.createElement('div');
    element.innerHTML =
      '<svg><title><x-title></x-title></title><desc><x-desc></x-desc></desc></svg>';

    const svg = element.firstElementChild!;
    expect(svg.children[0]?.firstElementChild?.namespaceURI).toBe(
      HTML_NAMESPACE,
    );
    expect(svg.children[1]?.firstElementChild?.namespaceURI).toBe(
      HTML_NAMESPACE,
    );
  });

  it.each(['foreignobject', 'ForeignObject', 'g'])(
    'keeps children of SVG %s controls in SVG',
    (name) => {
      let constructions = 0;
      class SvgControlLabel extends HTMLElement {
        constructor() {
          super();
          constructions += 1;
        }
      }
      customElements.define('x-svg-control-label', SvgControlLabel);
      const context = document.createElementNS(SVG_NAMESPACE, name);

      context.innerHTML = '<x-svg-control-label></x-svg-control-label>';

      expect(context.firstElementChild?.namespaceURI).toBe(SVG_NAMESPACE);
      expect(context.firstElementChild).not.toBeInstanceOf(SvgControlLabel);
      expect(constructions).toBe(0);
    },
  );

  it('places HTML breakout elements after open SVG frames', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    svg.innerHTML = '<g><p>one</p><circle/></g><path/>';

    expect([...svg.children].map(({localName}) => localName)).toEqual([
      'g',
      'p',
      'circle',
      'path',
    ]);
    expect([...svg.children].map(({namespaceURI}) => namespaceURI)).toEqual([
      SVG_NAMESPACE,
      HTML_NAMESPACE,
      SVG_NAMESPACE,
      SVG_NAMESPACE,
    ]);
    expect(svg.children[0]?.childNodes).toHaveLength(0);
  });

  it.each(['div', 'span', 'h1', 'img', 'table'])(
    'creates SVG breakout tag %s in the HTML namespace',
    (name) => {
      const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

      svg.innerHTML = `<${name}></${name}>`;

      expect(svg.firstElementChild?.namespaceURI).toBe(HTML_NAMESPACE);
    },
  );

  it.each([
    ['<font></font>', SVG_NAMESPACE],
    ['<font title="x"></font>', SVG_NAMESPACE],
    ['<font title=" color "></font>', SVG_NAMESPACE],
    ['<font data-color="red"></font>', SVG_NAMESPACE],
    ['<font color="red"></font>', HTML_NAMESPACE],
    ['<font FACE="serif"></font>', HTML_NAMESPACE],
    ['<font size="2"></font>', HTML_NAMESPACE],
  ])('conditionally breaks SVG parsing for %s', (html, namespace) => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    svg.innerHTML = html;

    expect(svg.firstElementChild?.namespaceURI).toBe(namespace);
  });

  it('keeps SVG frames when font trigger words are only attribute values', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    svg.innerHTML = '<g><font title=" color ">text</font><circle/></g>';

    const group = svg.firstElementChild!;
    expect([...group.children].map(({localName}) => localName)).toEqual([
      'font',
      'circle',
    ]);
    expect([...group.children].map(({namespaceURI}) => namespaceURI)).toEqual([
      SVG_NAMESPACE,
      SVG_NAMESPACE,
    ]);
  });

  it('preserves literal-colon parser names without weakening the public API', () => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');

    expect(() => {
      svg.innerHTML = '<xml:item></xml:item><p:shape/>';
    }).not.toThrow();

    expect(
      [...svg.children].map(({localName, namespaceURI, prefix}) => ({
        localName,
        namespaceURI,
        prefix,
      })),
    ).toEqual([
      {localName: 'xml:item', namespaceURI: SVG_NAMESPACE, prefix: null},
      {localName: 'p:shape', namespaceURI: SVG_NAMESPACE, prefix: null},
    ]);
    expect(() =>
      document.createElementNS(SVG_NAMESPACE, 'xml:item'),
    ).toThrowError(expect.objectContaining({name: 'NamespaceError'}));
    expect(() => document.createElementNS(null, 'p:shape')).toThrowError(
      expect.objectContaining({name: 'NamespaceError'}),
    );

    const publicShape = document.createElementNS(SVG_NAMESPACE, 'p:shape');
    expect(publicShape.localName).toBe('shape');
    expect(publicShape.prefix).toBe('p');
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

  it('does not match ancestor closing tags across an HTML template', () => {
    const element = document.createElement('div');

    element.innerHTML = '<section><template>Before</section>After</template>';

    const section = element.firstElementChild!;
    const template = section.firstElementChild as HTMLTemplateElement;
    expect(element.children).toEqual([section]);
    expect(template.content.textContent).toBe('BeforeAfter');
    expect(element.innerHTML).toBe(
      '<section><template>BeforeAfter</template></section>',
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

import '../polyfill/polyfill.ts';
import {describe, it, expect} from 'vitest';

import {html, type PropertiesWithChildren} from '../html.ts';

class Button extends HTMLElement {
  emphasized = false;
}

class RemoteFragment extends HTMLElement {}

customElements.define('ui-button', Button);
customElements.define('remote-fragment', RemoteFragment);

describe('html', () => {
  it('renders a text node', () => {
    const text = html`Hello world!` satisfies Text;

    expect(text).toBeInstanceOf(Text);
    expect(text.textContent).toBe('Hello world!');
  });

  it('renders an element', () => {
    const element = html`<ui-button>Press me!</ui-button>` satisfies Button;

    expect(element).toBeInstanceOf(Button);
    expect(element.localName).toBe('ui-button');
    expect(element.textContent).toBe('Press me!');
  });

  it('renders an element with attributes', () => {
    const element = html`
      <ui-button data-id="123">Press me!</ui-button>
    ` satisfies Button;

    expect(element.getAttribute('data-id')).toBe('123');
  });

  it('renders an element with boolean attributes', () => {
    const element = html`<ui-button active
      >Press me!</ui-button
    >` satisfies Button;

    expect(element.getAttribute('active')).toBe('');
  });

  it('renders an element with properties', () => {
    const element = html`<ui-button emphasized
      >Press me!</ui-button
    >` satisfies Button;

    expect(element.emphasized).toBe(true);
  });

  it('renders a node passed as a property to a slot with a matching name', () => {
    const icon = html`<ui-icon name="check" />`;
    const button = html`<ui-button icon=${icon}
      >Press me!</ui-button
    >` satisfies Button;

    expect(button.childNodes).toStrictEqual(
      expect.arrayContaining([expect.any(Text), expect.any(RemoteFragment)]),
    );
    expect(button.childNodes[1]!.childNodes).toEqual([icon]);
    expect((button.childNodes[1] as RemoteFragment).slot).toBe('icon');
  });

  it('renders multiple children', () => {
    const children = html`${'My button: '}
      <ui-button>Press me!</ui-button>` satisfies [Text, Button];

    expect(children).toStrictEqual(
      expect.arrayContaining([expect.any(Text), expect.any(Button)]),
    );
    expect(children[0].textContent).toBe('My button: ');
    expect(children[1].localName).toBe('ui-button');
    expect(children[1].textContent).toBe('Press me!');
  });

  it('can embed existing DOM nodes', () => {
    const text = html`Press me!`;
    const icon = html`<ui-icon slot="icon" name="check" />`;
    const button = html`<ui-button>${text}${icon}</ui-button>` satisfies Button;

    expect(button.localName).toBe('ui-button');
    expect(button.childNodes).toEqual([text, icon]);
  });

  it('converts numbers passed as children into text nodes', () => {
    const button = html`<ui-button
      >Clicked ${0} times</ui-button
    >` satisfies Button;

    expect(button.outerHTML).toBe('<ui-button>Clicked 0 times</ui-button>');
    expect(button.childNodes).toEqual([
      expect.any(Text),
      expect.any(Text),
      expect.any(Text),
    ]);
    expect(button.childNodes[1]!.textContent).toBe('0');
  });

  it('ignores falsy children', () => {
    const button = html`
      <ui-button>${false}${null}${undefined}Press me!<//>
    ` satisfies Button;

    expect(button.outerHTML).toBe('<ui-button>Press me!</ui-button>');
    expect(button.childNodes).toEqual([expect.any(Text)]);
  });

  describe('components', () => {
    it('returns the result of calling a component', () => {
      function MyButton({children}: PropertiesWithChildren) {
        return html`<ui-button>${children}</ui-button>` satisfies Button;
      }

      const button = html`<${MyButton}>Press me!<//>` satisfies Button;

      expect(button).toBeInstanceOf(Button);
      expect(button.localName).toBe('ui-button');
      expect(button.textContent).toBe('Press me!');
    });

    it('flattens top-level components returning multiple children', () => {
      function Description({
        term,
        definition,
      }: {
        term: string;
        definition: string;
      }) {
        return html`
          <dt>${term}</dt>
          <dd>${definition}</dd>
        `;
      }

      const descriptions = html`
        <${Description} term="Shovel" definition="A tool for digging" />
        <${Description} term="Rake" definition="A tool for cleaning up" />
      `;

      expect(descriptions).toStrictEqual([
        expect.any(Element),
        expect.any(Element),
        expect.any(Element),
        expect.any(Element),
      ]);
    });

    it('omits components that return falsy results', () => {
      function Empty() {
        return null;
      }

      const nothing = html`<${Empty} /><${Empty} />`;

      expect(nothing).toBeNull();
    });
  });
});

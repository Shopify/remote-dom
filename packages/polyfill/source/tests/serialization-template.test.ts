import {beforeEach, describe, expect, it} from 'vitest';

import {SVG_NAMESPACE} from '../constants.ts';
import type {HTMLTemplateElement} from '../HTMLTemplateElement.ts';
import {Window} from '../index.ts';

let window: Window;

describe('template parsing and serialization', () => {
  beforeEach(() => {
    window = new Window();
    Window.setGlobalThis(window);
  });

  it('serializes an empty template', () => {
    const template = window.document.createElement(
      'template',
    ) as HTMLTemplateElement;

    expect(template.outerHTML).toBe('<template></template>');
  });

  it('parses and serializes content between template tags', () => {
    const element = window.document.createElement('div');
    element.innerHTML = '<template><p class="message">Hello</p></template>';

    const template = element.firstElementChild as HTMLTemplateElement;
    expect(template.childNodes).toHaveLength(0);
    expect(template.content.childNodes).toHaveLength(1);
    expect(template.outerHTML).toBe(
      '<template><p class="message">Hello</p></template>',
    );
    expect(element.innerHTML).toBe(
      '<template><p class="message">Hello</p></template>',
    );
  });

  it('parses and serializes nested template content', () => {
    const element = window.document.createElement('div');
    element.innerHTML =
      '<template><p>Outer</p><template><span>Nested</span></template></template>';

    const template = element.firstElementChild as HTMLTemplateElement;
    const nestedTemplate = template.content.children[1] as HTMLTemplateElement;
    expect(template.content.children).toHaveLength(2);
    expect(nestedTemplate.childNodes).toHaveLength(0);
    expect(nestedTemplate.content.children[0]?.localName).toBe('span');
    expect(element.innerHTML).toBe(
      '<template><p>Outer</p><template><span>Nested</span></template></template>',
    );
  });

  it('restores the outer insertion target after a template closes', () => {
    const element = window.document.createElement('div');
    element.innerHTML = '<template><b>x</b></template><i>y</i>';

    const template = element.children[0] as HTMLTemplateElement;
    expect(element.children).toHaveLength(2);
    expect(template.content.children[0]?.localName).toBe('b');
    expect(element.children[1]?.localName).toBe('i');
    expect(element.innerHTML).toBe('<template><b>x</b></template><i>y</i>');
  });

  it('keeps ordinary element children as direct children', () => {
    const element = window.document.createElement('div');
    element.innerHTML = '<section><p>x</p></section>';

    const section = element.firstElementChild!;
    expect(section.childNodes).toHaveLength(1);
    expect(section.firstElementChild?.localName).toBe('p');
    expect(element.innerHTML).toBe('<section><p>x</p></section>');
  });

  it('preserves template content during reentrant parsing', () => {
    const nested = window.document.createElement('div');
    let callbackCount = 0;

    class ReentrantTemplateElement extends HTMLElement {
      static observedAttributes = ['data-nested'];

      attributeChangedCallback() {
        callbackCount += 1;
        nested.innerHTML = '<template><span>Nested</span></template>';
      }
    }

    customElements.define(
      'reentrant-template-element',
      ReentrantTemplateElement,
    );

    const element = window.document.createElement('div');
    element.innerHTML =
      '<reentrant-template-element data-nested="yes"></reentrant-template-element><template><p>Outer</p></template><i>After</i>';

    const nestedTemplate = nested.firstElementChild as HTMLTemplateElement;
    const outerTemplate = element.children[1] as HTMLTemplateElement;
    expect(callbackCount).toBe(1);
    expect(nestedTemplate.content.children[0]?.localName).toBe('span');
    expect(nestedTemplate.outerHTML).toBe(
      '<template><span>Nested</span></template>',
    );
    expect(outerTemplate.content.children[0]?.localName).toBe('p');
    expect(element.innerHTML).toBe(
      '<reentrant-template-element data-nested="yes"></reentrant-template-element><template><p>Outer</p></template><i>After</i>',
    );
  });

  it('preserves escaping, comments, and HTML void serialization in templates', () => {
    const template = window.document.createElement(
      'template',
    ) as HTMLTemplateElement;
    template.innerHTML =
      '<p title="Fish &amp; &quot;chips&quot;">Fish &amp; &lt;chips&gt;<!--note--></p><br>';

    expect(template.outerHTML).toBe(
      '<template><p title="Fish &amp; &quot;chips&quot;">Fish &amp; &lt;chips&gt;<!--note--></p><br></template>',
    );
  });

  it('only omits void-element closing tags in the HTML namespace', () => {
    const htmlBreak = window.document.createElement('br');
    const svgBreak = window.document.createElementNS(SVG_NAMESPACE, 'br');

    expect(htmlBreak.outerHTML).toBe('<br>');
    expect(svgBreak.outerHTML).toBe('<br></br>');
  });

  it('serializes 6,000 nested templates without overflowing', () => {
    const depth = 6_000;
    const template = window.document.createElement(
      'template',
    ) as HTMLTemplateElement;
    let parent = template;

    for (let index = 1; index < depth; index += 1) {
      const nestedTemplate = window.document.createElement(
        'template',
      ) as HTMLTemplateElement;
      parent.content.append(nestedTemplate);
      parent = nestedTemplate;
    }
    parent.content.append('deep');

    const expected =
      '<template>'.repeat(depth) + 'deep' + '</template>'.repeat(depth);
    expect(template.outerHTML).toBe(expected);
  }, 20_000);

  it('serializes 6,000 parsed nested templates without overflowing', () => {
    const depth = 6_000;
    const expected =
      '<template>'.repeat(depth) + 'deep' + '</template>'.repeat(depth);
    const element = window.document.createElement('div');
    element.innerHTML = expected;

    expect(element.innerHTML).toBe(expected);
  }, 20_000);
});

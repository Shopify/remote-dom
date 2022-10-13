// This file implements a few custom elements with Lit, a tiny
// framework for creating web components. To learn more about Lit,
// you can visit https://lit.dev.

import {html, css, LitElement} from 'lit';

const SIZES = ['extraSmall', 'small', 'base', 'large', 'extraLarge', 'medium'];

export class UiBlockLayout extends LitElement {
  static get name() {
    return 'ui-block-layout';
  }

  static get properties() {
    return {
      rows: {type: String, reflect: true},
    };
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        grid-template-rows: var(--rows);
      }
    `;
  }

  update(props) {
    if (props.rows) {
      this.style.setProperty('rows', props.rows);
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

export class UiBlockStack extends LitElement {
  static get name() {
    return 'ui-block-stack';
  }

  static get properties() {
    return {
      spacing: {type: String, reflect: true},
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      :host([spacing='none']) {
        gap: 0;
      }
      :host([spacing='extraTight']) {
        gap: 2px;
      }
      :host([spacing='tight']) {
        gap: 4px;
      }
      :host([spacing='loose']) {
        gap: 16px;
      }
      :host([spacing='extraLoose']) {
        gap: 24px;
      }
    `;
  }

  render() {
    return html`<slot></slot>`;
  }
}

export class UiInlineStack extends LitElement {
  static get name() {
    return 'ui-inline-stack';
  }

  static get properties() {
    return {
      spacing: {type: String, reflect: true},
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: row;
        gap: 8px;
      }
      :host([spacing='none']) {
        gap: 0;
      }
      :host([spacing='extraTight']) {
        gap: 2px;
      }
      :host([spacing='tight']) {
        gap: 4px;
      }
      :host([spacing='loose']) {
        gap: 16px;
      }
      :host([spacing='extraLoose']) {
        gap: 24px;
      }
    `;
  }

  render() {
    return html`<slot></slot>`;
  }
}

export class UiView extends LitElement {
  static get name() {
    return 'ui-view';
  }

  static get properties() {
    return {
      borderWidth: {type: String, reflect: true},
      borderRadius: {type: Number, reflect: true},
      padding: {type: String, reflect: true},
      overflow: {type: String, refelct: true},
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        flex: 1;
        border: 0px solid rgba(100, 100, 100, 0.5);
      }
      :host([overflow='auto']) {
        overflow: auto;
      }
      :host([overflow='scroll']) {
        overflow: scroll;
      }
      :host([borderRadius]) {
        border-radius: calc(1px * var(--border-radius));
      }
      :host([borderWidth='extraSmall']),
      :host([borderWidth='small']) {
        border-width: 0.5px;
      }
      :host([borderWidth='base']) {
        border-width: 1px;
      }
      :host([borderWidth='medium']) {
        border-width: 2px;
      }
      :host([borderWidth='large']) {
        border-width: 4px;
      }
      :host([borderWidth='extraLarge']) {
        border-width: 8px;
      }
      :host([padding='tight']) {
        padding: 4px;
      }
      :host([padding='base']) {
        padding: 8px;
      }
      :host([padding='loose']) {
        padding: 12px;
      }
    `;
  }

  render() {
    this.style.setProperty('--border-radius', this.borderRadius || '');
    return html`<slot></slot>`;
  }
}

export class UiTextBlock extends LitElement {
  static get name() {
    return 'ui-text-block';
  }

  static get properties() {
    return {
      inlineAlignment: {type: String, reflect: true},
      monospace: {type: Boolean, reflect: true},
      color: {type: String, reflect: true},
      overflow: {type: String, reflect: true},
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        text-align: center;
        color: var(--color);
      }
      :host([overflow='auto']) {
        overflow: auto;
      }
      :host([overflow='scroll']) {
        overflow: scroll;
      }
      :host([inlineAlignment='start']) {
        text-align: left;
      }
      :host([inlineAlignment='end']) {
        text-align: right;
      }
      :host([monospace]) {
        white-space: pre;
        font-family: monospace;
      }
    `;
  }

  render() {
    this.style.setProperty('--color', this.color || '');
    return html`<slot></slot>`;
  }
}

export class UiText extends LitElement {
  static get name() {
    return 'ui-text';
  }

  static get properties() {
    return {
      size: {
        type: String,
        reflect: true,
      },
      color: {
        type: String,
        reflect: true,
      },
    };
  }

  static get styles() {
    return css`
      :host {
        color: var(--color);
      }
      :host([size='extraSmall']) {
        font-size: 0.6rem;
      }
      :host([size='small']) {
        font-size: 0.8rem;
      }
      :host([size='medium']) {
        font-size: 1.2rem;
      }
      :host([size='large']) {
        font-size: 2rem;
      }
      :host([size='extraLarge']) {
        font-size: 3rem;
      }
    `;
  }

  render() {
    this.style.setProperty('--color', this.color || '');
    return html`<slot></slot>`;
  }
}

export class UiStack extends LitElement {
  static get name() {
    return 'ui-stack';
  }

  static get properties() {
    return {
      vertical: {
        type: Boolean,
        attribute: true,
        reflect: true,
        noAccessor: true,
      },
      align: {
        type: String,
        reflect: true,
      },
    };
  }

  get vertical() {
    return this.hasAttribute('vertical');
  }

  set vertical(value) {
    const vertical = value != null;
    const oldValue = this.hasAttribute('vertical');
    this.toggleAttribute('vertical', vertical);
    this.requestUpdate('vertical', oldValue);
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }
      :host([vertical]) {
        flex-direction: column;
      }
      :host([align='start']) {
        align-items: flex-start;
      }
      :host([align='center']) {
        align-items: center;
      }
      :host([align='end']) {
        align-items: flex-end;
      }
      :host([align='stretch']) {
        align-items: stretch;
      }
    `;
  }

  render() {
    return html`<slot></slot>`;
  }
}

export class UiStackItem extends LitElement {
  static get name() {
    return 'ui-stack-item';
  }

  static get properties() {
    return {
      padding: {type: String, reflect: true},
    };
  }

  static get styles() {
    return css`
      :host {
        flex: 1;
      }
      :host([padding='tight']) {
        padding: 4px;
      }
      :host([padding='base']) {
        padding: 8px;
      }
      :host([padding='loose']) {
        padding: 12px;
      }
    `;
  }

  render() {
    return html`<slot></slot>`;
  }
}

export class UiButton extends LitElement {
  static get name() {
    return 'ui-button';
  }

  static get properties() {
    return {
      onPress: {type: Function},
      highlight: {type: Boolean, reflect: true},
    };
  }

  static get styles() {
    return css`
      .Button {
        outline: none;
        position: relative;
        appearance: none;
        border: none;
        background: rgb(47, 29, 67);
        color: inherit;
        display: block;
        width: 100%;
        border-radius: 8px;
        font-size: 1em;
        padding: 0.5em;
        transition: background 0.15s ease;
      }

      .Button::after {
        --Button-focus-ring-offset: 2px;

        content: '';
        position: absolute;
        z-index: 1;
        top: calc(-1 * var(--Button-focus-ring-offset));
        right: calc(-1 * var(--Button-focus-ring-offset));
        bottom: calc(-1 * var(--Button-focus-ring-offset));
        left: calc(-1 * var(--Button-focus-ring-offset));
        display: block;
        pointer-events: none;
        box-shadow: 0 0 0 0 transparent;
        transition: box-shadow 0.15s ease;
        border-radius: calc(8px + var(--Button-focus-ring-offset));
      }

      .Button:focus {
        outline: 1px solid transparent;
      }

      .Button:focus-visible::after {
        box-shadow: 0 0 0 2px rgb(214, 117, 226);
      }

      .Button:hover,
      .Button:focus-visible {
        background: rgb(79, 39, 124);
      }

      .Button:active {
        background: rgb(51, 16, 90);
      }

      :host([highlight]) .Button {
        background: rgb(151, 116, 190);
      }
    `;
  }

  render() {
    return html`
      <button @click=${this.handlePress} class="Button" type="button">
        <slot></slot>
      </button>
    `;
  }

  handlePress() {
    this.onPress && this.onPress();
  }
}

export class UiTextField extends LitElement {
  static get name() {
    return 'ui-text-field';
  }

  static get properties() {
    return {
      label: {type: String},
      value: {type: String, reflect: true},
      multiline: {type: Boolean, reflect: true},
    };
  }

  static get styles() {
    return css`
      * {
        box-sizing: border-box;
      }

      .Label {
        display: block;
        color: rgb(212, 169, 205);
        font-size: 0.85em;
        margin-bottom: 0.25em;
      }

      .InputContainer {
        position: relative;
      }

      .Input {
        display: block;
        width: 100%;
        appearance: none;
        background: rgb(4, 0, 8);
        border: 1px solid rgb(212, 169, 205);
        color: inherit;
        font-size: 1em;
        padding: 0.5em 1em;
        border-radius: 8px;
      }

      textarea {
        text-align: left;
        height: 8em;
      }

      .Input:focus {
        outline: 1px solid transparent;
      }

      .InputBackdrop {
        --TextField-focus-ring-offset: 2px;

        position: absolute;
        z-index: 1;
        top: calc(-1 * var(--TextField-focus-ring-offset));
        right: calc(-1 * var(--TextField-focus-ring-offset));
        bottom: calc(-1 * var(--TextField-focus-ring-offset));
        left: calc(-1 * var(--TextField-focus-ring-offset));
        display: block;
        pointer-events: none;
        box-shadow: 0 0 0 0 transparent;
        transition: box-shadow 0.15s ease;
        border-radius: calc(8px + var(--TextField-focus-ring-offset));
      }

      .Input:focus-visible ~ .InputBackdrop {
        box-shadow: 0 0 0 2px rgb(214, 117, 226);
      }
    `;
  }

  constructor() {
    super();
    this.value = '';
  }

  handleInput(e) {
    e.stopImmediatePropagation();
    const value = e.currentTarget.value;
    this.value = value;
    // force remote-ui DOM host to pass a currentTarget with a value:
    const event = new InputEvent('input', {bubbles: true});
    Object.defineProperty(event, 'currentTarget', {
      enumerable: true,
      value: {value},
    });
    this.dispatchEvent(event);
  }

  id = nanoId();

  render() {
    return html`
      <div class="TextField">
        <label class="Label" for=${this.id}>${this.label}</label>
        <div class="InputContainer">
          ${this.multiline
            ? html`
                <textarea
                  id=${this.id}
                  class="Input"
                  .value=${this.value || ''}
                  @input=${this.handleInput.bind(this)}
                />
              `
            : html`
                <input
                  id=${this.id}
                  class="Input"
                  .value=${this.value || ''}
                  @input=${this.handleInput.bind(this)}
                />
              `}
          <div class="InputBackdrop"></div>
        </div>
      </div>
    `;
  }
}

// @see https://github.com/ai/nanoid/blob/main/non-secure/index.js

// This alphabet uses `A-Za-z0-9_-` symbols. The genetic algorithm helped
// optimize the gzip compression for this alphabet.
const urlAlphabet =
  'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';

function nanoId(size = 21) {
  let id = '';
  // A compact alternative for `for (var i = 0; i < step; i++)`.
  let i = size;
  while (i--) {
    // `| 0` is more compact and faster than `Math.floor()`.
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}

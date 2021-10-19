// This file implements a few custom elements with Lit, a tiny
// framework for creating web components. To learn more about Lit,
// you can visit https://lit.dev.

import {html, css, LitElement} from 'https://cdn.skypack.dev/lit';

export class UiButton extends LitElement {
  static get name() {
    return 'ui-button';
  }

  static get properties() {
    return {
      onPress: {type: Function},
    };
  }

  static get styles() {
    return css`
      .Button {
        outline: none;
        position: relative;
        appearance: none;
        border: none;
        background: rgb(27, 9, 47);
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
        background: rgb(59, 19, 104);
      }

      .Button:active {
        background: rgb(51, 16, 90);
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
        background: transparent;
        border: 1px solid rgb(212, 169, 205);
        color: inherit;
        font-size: 1em;
        padding: 0.5em 1em;
        border-radius: 8px;
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

  get value() {
    return this.shadowRoot.querySelector('input').value;
  }

  id = nanoId();

  render() {
    return html`
      <div class="TextField">
        <label class="Label" for=${this.id}>${this.label}</label>
        <div class="InputContainer">
          <input id=${this.id} class="Input" type="text"></input>
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

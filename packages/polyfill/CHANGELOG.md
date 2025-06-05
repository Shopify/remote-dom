# @remote-dom/polyfill

## 1.4.5

### Patch Changes

- [#571](https://github.com/Shopify/remote-dom/pull/571) [`0bba42b`](https://github.com/Shopify/remote-dom/commit/0bba42b3246fd100fce6cc03900f2b4645092264) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix Element.innerHTML not allowing newlines before attributes

## 1.4.4

### Patch Changes

- [#570](https://github.com/Shopify/remote-dom/pull/570) [`33baaba`](https://github.com/Shopify/remote-dom/commit/33baaba512ca461068f57dcba707ef1cc640bfca) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix event listener methods not being bound to correctly

## 1.4.3

### Patch Changes

- [#541](https://github.com/Shopify/remote-dom/pull/541) [`f42f535`](https://github.com/Shopify/remote-dom/commit/f42f535fb08ace5ba9a4332f39b49281fd0880f3) Thanks [@developit](https://github.com/developit)! - fix typo in previousElementSibling

## 1.4.2

### Patch Changes

- [#499](https://github.com/Shopify/remote-dom/pull/499) [`994e2ea`](https://github.com/Shopify/remote-dom/commit/994e2ea2f7ab0e67a2c37e5295ce86618b004518) Thanks [@lemonmade](https://github.com/lemonmade)! - Roll back mutation of `globalThis` and `globalThis.self` in `Window.setGlobal()`

  This prevents the polyfill from interfering with globals like `globalThis.addEventListener`, which you may need to manage the communication between a sandboxed environment and the main thread.

  In the future, we will likely change the polyfill to require you to explicitly install the polyfill, instead of it being done automatically when you `@remote-dom/core/polyfill`. At that point, we will reintroduce the ability to more faithfully replicate more DOM globals, like having `globalThis`, `globalThis.self`, and `globalThis.window` all refer to the same polyfilled `Window` object. To install this polyfill today and get back to the behavior introduced by [this PR](https://github.com/Shopify/remote-dom/pull/470), you can call the new `Window.setGlobalThis()` method:

  ```js
  import {window, Window} from '@remote-dom/core/polyfill';

  Window.setGlobalThis(window);
  ```

## 1.4.1

### Patch Changes

- [#472](https://github.com/Shopify/remote-dom/pull/472) [`1473a3c`](https://github.com/Shopify/remote-dom/commit/1473a3c521e8d4d44d50c2f15680f28997270dc8) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Fix removeChild so it clears parent/sibling references

- [#472](https://github.com/Shopify/remote-dom/pull/472) [`1473a3c`](https://github.com/Shopify/remote-dom/commit/1473a3c521e8d4d44d50c2f15680f28997270dc8) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Add node.parentElement

- [#470](https://github.com/Shopify/remote-dom/pull/470) [`08839d3`](https://github.com/Shopify/remote-dom/commit/08839d3c136b63024ef725d9cf427e250f2978d3) Thanks [@developit](https://github.com/developit)! - window aliases should refer to globalThis

## 1.4.0

### Minor Changes

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Implement node.isConnected

### Patch Changes

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Ensure that the insert and remove hooks are only called for element parents.

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Make connectedCallback and disconnectedCallback call on connect/disconnect recursively

## 1.3.1

### Patch Changes

- [#436](https://github.com/Shopify/remote-dom/pull/436) [`5979797`](https://github.com/Shopify/remote-dom/commit/59797975a3ccf2bee825809f67e05ca4a28e2647) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Ensure the `createText` hook is called when creating a new text node

## 1.3.0

### Minor Changes

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Added native support for synchronizing attributes and event listeners

  Previously, Remote DOM only offered “remote properties” as a way to synchronize element state between the host and remote environments. These remote properties effectively synchronize a subset of a custom element’s instance properties. The `RemoteElement` class offers [a declarative way to define the properties that should be synchronized](/packages/core/README.md#remote-properties).

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteProperties() {
      return ['label'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');
  myElement.label = 'Hello, World!';
  ```

  The same `remoteProperties` configuration can create special handling for attributes and event listeners. By default, a remote property is automatically updated when setting an [attribute](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) of the same name:

  ```ts
  const myElement = document.createElement('my-element');
  myElement.setAttribute('label', 'Hello, World!');

  // myElement.label === 'Hello, World!', and this value is synchronized
  // with the host environment as a “remote property”
  ```

  Similarly, a remote property can be automatically updated when adding an event listener based on a conventional `on` property naming prefix:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteProperties() {
      return {
        onChange: {
          event: true,
        },
      };
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  // This adds a callback property that is synchronized with the host environment
  myElement.onChange = () => console.log('Changed!');

  // And so does this, but using the `addEventListener` method instead
  myElement.addEventListener('change', () => console.log('Changed!'));
  ```

  These utilities are handy, but they don’t align with patterns in native DOM elements, particularly when it comes to events. Now, both of these can be represented in a fashion that is more conventional in HTML. The `remoteAttributes` configuration allows you to define a set of element attributes that will be synchronized directly the host environment, instead of being treated as instance properties:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteAttributes() {
      return ['label'];
    }

    // If you want to add instance properties, you can do it with getters and
    // setters that manipulate the attribute value:
    //
    // get label() {
    //   return this.getAttribute('label');
    // }
    //
    // set label(value) {
    //   this.setAttribute('label', value);
    // }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');
  myElement.setAttribute('label', 'Hello, World!');
  ```

  Similarly, the `remoteEvents` configuration allows you to define a set of event listeners that will be synchronized directly with the host environment:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteEvents() {
      return ['change'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  // And so does this, but using the `addEventListener` method instead
  myElement.addEventListener('change', () => console.log('Changed!'));

  // No `myElement.onChange` property is created
  ```

  The `remoteProperties` configuration will continue to be supported for cases where you want to synchronize instance properties. Because instance properties can be any JavaScript type, properties are the highest-fidelity field that can be synchronized between the remote and host environments. However, adding event listeners using the `remoteProperties.event` configuration is **deprecated and will be removed in the next major version**. You should use the `remoteEvents` configuration instead. If you were previously defining remote properties which only accepted strings, consider using the `remoteAttributes` configuration, which stores the value entirely in an HTML attribute instead.

  This change is being released in a backwards-compatible way, so you can continue to use the existing `remoteProperties` configuration on host and/or remote environments without any code changes.

  All host utilities have been updated to support the new `attributes` and `eventListeners` property that are synchronized with the remote environment. This includes updates to the [React](/packages/react/README.md#event-listener-props) and [Preact hosts to map events to conventional callback props](/packages/preact/README.md#event-listener-props), and updates to the [`DOMRemoteReceiver` class](/packages/core/README.md#domremotereceiver), which now applies fields to the host element exactly as they were applied in the remote environment:

  ```ts
  // Remote environment:

  class MyElement extends RemoteElement {
    static get remoteEvents() {
      return ['change'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  myElement.addEventListener('change', (event) => {
    console.log('Changed! New value: ', event.detail);
  });

  // Host environment:

  class MyElement extends HTMLElement {
    connectedCallback() {
      // Emit a change event on this element, with detail that will be passed
      // to the remote environment
      this.addEventListener('change', (event) => {
        event.stopImmediatePropagation();

        this.dispatchEvent(
          new CustomEvent('change', {
            detail: this.value,
          }),
        );
      });
    }

    // Additional implementation details of the host custom element...
  }

  customElements.define('my-element', MyElement);
  ```

### Patch Changes

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Bug fixes to event dispatching

  - Listeners on the target are now called during both the capture and bubble phases.
  - `stopPropagation` now respected.
  - `stopImmediatePropagation` now also stops regular propagation.

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `Event.bubbles` and `Event.composedPath()` implementations

## 1.2.1

### Patch Changes

- [#419](https://github.com/Shopify/remote-dom/pull/419) [`3c6bd29`](https://github.com/Shopify/remote-dom/commit/3c6bd291121b9fa02cac4ba57274601e97b2a2d2) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix synchronization of `slot` property in some edge cases

## 1.2.0

### Minor Changes

- [#411](https://github.com/Shopify/remote-dom/pull/411) [`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add CommonJS export conditions

## 1.1.0

### Minor Changes

- [#402](https://github.com/Shopify/remote-dom/pull/402) [`218ba3b`](https://github.com/Shopify/remote-dom/commit/218ba3bf1ff2e7518a7dcec11ffd352de70b16f8) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Refactor hooks into the Window instance

## 1.0.6

### Patch Changes

- [#406](https://github.com/Shopify/remote-dom/pull/406) [`2ea3459`](https://github.com/Shopify/remote-dom/commit/2ea3459e29afc1421b3283ad59514fed38a52515) Thanks [@developit](https://github.com/developit)! - Fixes `hooks.addEventListener()` being called even when `EventTarget.addEventListener()` rejects a duplicate listener registration

## 1.0.5

### Patch Changes

- [#401](https://github.com/Shopify/remote-dom/pull/401) [`578a8c6`](https://github.com/Shopify/remote-dom/commit/578a8c69ed1df63da77ab5a0efd0b28f8a0188d9) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Expose documentElement, head and body elements on the Document polyfill

## 1.0.4

### Patch Changes

- [`72304d6`](https://github.com/Shopify/remote-dom/commit/72304d6a76d28712c62698803d6ec65d9ac29614) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `Node.contains()` method used by React

- [`e6deda6`](https://github.com/Shopify/remote-dom/commit/e6deda6b90c4c6cff94cac60619a7ef1deb7524e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add missing `CustomElementRegistry.getName()` function

## 1.0.3

### Patch Changes

- [`549a423`](https://github.com/Shopify/remote-dom/commit/549a423b31d89354fa8ef91e8533eff69953d695) Thanks [@lemonmade](https://github.com/lemonmade)! - Consult custom elements in `createElementNS`

- [`31f8720`](https://github.com/Shopify/remote-dom/commit/31f8720e916ce8ac69bc079ba8e2aac089313605) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `createElementNS` argument ordering

## 1.0.2

### Patch Changes

- [`7d5327c`](https://github.com/Shopify/remote-dom/commit/7d5327ca3fd02f625bb404d43d9b0f7c9a3b079d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix making `window` non-configurable in polyfill

## 1.0.1

### Patch Changes

- [#281](https://github.com/Shopify/remote-dom/pull/281) [`0c51bbc`](https://github.com/Shopify/remote-dom/commit/0c51bbc2c7419ce23e1b8d02d4a0323c5b180672) Thanks [@santala](https://github.com/santala)! - Fix missing createElement hook call

- [#281](https://github.com/Shopify/remote-dom/pull/281) [`6768867`](https://github.com/Shopify/remote-dom/commit/6768867ac4f24059c30daeaf9d6dc1f4809b0155) Thanks [@santala](https://github.com/santala)! - Fix Node.textContent incorrectly appending the textContent of subsequent siblings

## 1.0.0

### Major Changes

- [`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf) Thanks [@lemonmade](https://github.com/lemonmade)! - First release of Remote DOM. Read more about this [refactor of remote-ui on native DOM APIs](https://github.com/Shopify/remote-dom/discussions/267), and take a look at the [updated documentation](/README.md).

## 0.1.0

### Minor Changes

- [`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82) Thanks [@lemonmade](https://github.com/lemonmade)! - Test minor bump

## 0.0.2

### Patch Changes

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a) Thanks [@lemonmade](https://github.com/lemonmade)! - Test version bump

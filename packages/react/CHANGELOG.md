# @remote-dom/react

## 1.2.2

### Patch Changes

- [#536](https://github.com/Shopify/remote-dom/pull/536) [`9abf5be`](https://github.com/Shopify/remote-dom/commit/9abf5bee323dfa522f9061ba61ce2f433a36cb4e) Thanks [@igor10k](https://github.com/igor10k)! - Use the same core dependency version for all packages

## 1.2.1

### Patch Changes

- [#492](https://github.com/Shopify/remote-dom/pull/492) [`59f417b`](https://github.com/Shopify/remote-dom/commit/59f417b4abe5aa5d59999200430a18f5fe1aa810) Thanks [@lemonmade](https://github.com/lemonmade)! - Apply React polyfill directly to `globalThis`

## 1.2.0

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

- Updated dependencies [[`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403)]:
  - @remote-dom/core@1.5.0

## 1.1.0

### Minor Changes

- [#411](https://github.com/Shopify/remote-dom/pull/411) [`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add CommonJS export conditions

### Patch Changes

- Updated dependencies [[`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f)]:
  - @remote-dom/core@1.4.0

## 1.0.2

### Patch Changes

- [`6e1f6b6`](https://github.com/Shopify/remote-dom/commit/6e1f6b69aec1958e9e5f125bd9d16847f905efa7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React package including `preact/jsx-runtime` imports in output

## 1.0.1

### Patch Changes

- [`2b09e04`](https://github.com/Shopify/remote-dom/commit/2b09e042ff87f047fbe98481a73d31b785c9987f) Thanks [@lemonmade](https://github.com/lemonmade)! - Ensure React polyfill includes minimal `location` and `navigator` polyfills

## 1.0.0

### Major Changes

- [`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf) Thanks [@lemonmade](https://github.com/lemonmade)! - First release of Remote DOM. Read more about this [refactor of remote-ui on native DOM APIs](https://github.com/Shopify/remote-dom/discussions/267), and take a look at the [updated documentation](/README.md).

### Patch Changes

- Updated dependencies [[`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf)]:
  - @remote-dom/core@1.0.0

## 0.1.3

### Patch Changes

- [`7398741`](https://github.com/Shopify/remote-dom/commit/7398741dc42f474d344ed98ea634bc6a255d6650) Thanks [@lemonmade](https://github.com/lemonmade)! - Mark React polyfill as having side effects

## 0.1.2

### Patch Changes

- [#269](https://github.com/Shopify/remote-dom/pull/269) [`e4629a7`](https://github.com/Shopify/remote-dom/commit/e4629a7e50057eb57f8a2f90b393fba6688d0d19) Thanks [@shopify-github-actions-access](https://github.com/apps/shopify-github-actions-access)! - Add React-specific polyfills

## 0.1.1

### Patch Changes

- Updated dependencies [[`9576a72`](https://github.com/Shopify/remote-dom/commit/9576a72fa354481621c53efde4169829fe9bfabf)]:
  - @remote-dom/core@0.1.1

## 0.1.0

### Minor Changes

- [`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82) Thanks [@lemonmade](https://github.com/lemonmade)! - Test minor bump

### Patch Changes

- Updated dependencies [[`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82)]:
  - @remote-dom/core@0.1.0

## 0.0.2

### Patch Changes

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a) Thanks [@lemonmade](https://github.com/lemonmade)! - Test version bump

- Updated dependencies [[`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a), [`8e1fad4`](https://github.com/Shopify/remote-dom/commit/8e1fad4a00cfe68ff1594fbabeec10c29958685f)]:
  - @remote-dom/core@0.0.2

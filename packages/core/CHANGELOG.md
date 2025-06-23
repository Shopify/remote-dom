# @remote-dom/core

## 1.8.1

### Patch Changes

- [#581](https://github.com/Shopify/remote-dom/pull/581) [`d4fd36d`](https://github.com/Shopify/remote-dom/commit/d4fd36df90a7813b5003c5a88386335958d11d65) Thanks [@robin-drexler](https://github.com/robin-drexler)! - Fix missing side effect declaration

## 1.8.0

### Minor Changes

- [#576](https://github.com/Shopify/remote-dom/pull/576) [`ed2d24c`](https://github.com/Shopify/remote-dom/commit/ed2d24cb0d4a4b4146a1507796a40b4fdc3aaf8d) Thanks [@robin-drexler](https://github.com/robin-drexler)! - Allow to import hooks without global window override side effect

## 1.7.1

### Patch Changes

- [#570](https://github.com/Shopify/remote-dom/pull/570) [`33baaba`](https://github.com/Shopify/remote-dom/commit/33baaba512ca461068f57dcba707ef1cc640bfca) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix event listener methods not being bound to correctly

- Updated dependencies [[`33baaba`](https://github.com/Shopify/remote-dom/commit/33baaba512ca461068f57dcba707ef1cc640bfca)]:
  - @remote-dom/polyfill@1.4.4

## 1.7.0

### Minor Changes

- [#533](https://github.com/Shopify/remote-dom/pull/533) [`a9a88ab`](https://github.com/Shopify/remote-dom/commit/a9a88abe4ba81b253f0cc6cdd5e82a25bbe908c1) Thanks [@igor10k](https://github.com/igor10k)! - Make `removeChild` less strict in receivers

## 1.6.1

### Patch Changes

- [#528](https://github.com/Shopify/remote-dom/pull/528) [`df294ab`](https://github.com/Shopify/remote-dom/commit/df294abad5522110e031e5b3e2a978871aa703fb) Thanks [@brianshen1990](https://github.com/brianshen1990)! - return early if falling back to setTimeout for MessageChannel

## 1.6.0

### Minor Changes

- [#526](https://github.com/Shopify/remote-dom/pull/526) [`8cbf2c2`](https://github.com/Shopify/remote-dom/commit/8cbf2c2a6130dd0a19088a2adf18b506f468be8b) Thanks [@robin-drexler](https://github.com/robin-drexler)! - add flush method to BatchingRemoteConnection

## 1.5.2

### Patch Changes

- [#517](https://github.com/Shopify/remote-dom/pull/517) [`99a8e1a`](https://github.com/Shopify/remote-dom/commit/99a8e1ad8d441619a33a5a4c3f2424fe1ccbe8df) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing attributes and event listeners on root receiver elements

## 1.5.1

### Patch Changes

- [#499](https://github.com/Shopify/remote-dom/pull/499) [`994e2ea`](https://github.com/Shopify/remote-dom/commit/994e2ea2f7ab0e67a2c37e5295ce86618b004518) Thanks [@lemonmade](https://github.com/lemonmade)! - Roll back mutation of `globalThis` and `globalThis.self` in `Window.setGlobal()`

  This prevents the polyfill from interfering with globals like `globalThis.addEventListener`, which you may need to manage the communication between a sandboxed environment and the main thread.

  In the future, we will likely change the polyfill to require you to explicitly install the polyfill, instead of it being done automatically when you `@remote-dom/core/polyfill`. At that point, we will reintroduce the ability to more faithfully replicate more DOM globals, like having `globalThis`, `globalThis.self`, and `globalThis.window` all refer to the same polyfilled `Window` object. To install this polyfill today and get back to the behavior introduced by [this PR](https://github.com/Shopify/remote-dom/pull/470), you can call the new `Window.setGlobalThis()` method:

  ```js
  import {window, Window} from '@remote-dom/core/polyfill';

  Window.setGlobalThis(window);
  ```

- [#465](https://github.com/Shopify/remote-dom/pull/465) [`017ca02`](https://github.com/Shopify/remote-dom/commit/017ca029fb148a51115edb12b7c8ccd49d2c52eb) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `slot` to be transmitted as an attribute, not a property

- Updated dependencies [[`994e2ea`](https://github.com/Shopify/remote-dom/commit/994e2ea2f7ab0e67a2c37e5295ce86618b004518)]:
  - @remote-dom/polyfill@1.4.2

## 1.5.0

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

- Updated dependencies [[`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403), [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403), [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403)]:
  - @remote-dom/polyfill@1.3.0

## 1.4.1

### Patch Changes

- [#419](https://github.com/Shopify/remote-dom/pull/419) [`3c6bd29`](https://github.com/Shopify/remote-dom/commit/3c6bd291121b9fa02cac4ba57274601e97b2a2d2) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix synchronization of `slot` property in some edge cases

## 1.4.0

### Minor Changes

- [#411](https://github.com/Shopify/remote-dom/pull/411) [`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add CommonJS export conditions

### Patch Changes

- Updated dependencies [[`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f)]:
  - @remote-dom/polyfill@1.2.0

## 1.3.0

### Minor Changes

- [#402](https://github.com/Shopify/remote-dom/pull/402) [`218ba3b`](https://github.com/Shopify/remote-dom/commit/218ba3bf1ff2e7518a7dcec11ffd352de70b16f8) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Refactor hooks into the Window instance

### Patch Changes

- Updated dependencies [[`218ba3b`](https://github.com/Shopify/remote-dom/commit/218ba3bf1ff2e7518a7dcec11ffd352de70b16f8)]:
  - @remote-dom/polyfill@1.1.0

## 1.2.1

### Patch Changes

- [#405](https://github.com/Shopify/remote-dom/pull/405) [`6b38a37`](https://github.com/Shopify/remote-dom/commit/6b38a379ef2f0644bff18390708a48b4f6d3fa5d) Thanks [@vividviolet](https://github.com/vividviolet)! - Export BatchingRemoteConnection so it can be used

## 1.2.0

### Minor Changes

- [`040e7c5`](https://github.com/Shopify/remote-dom/commit/040e7c5dde658596ccbf883e2d3810955790eff0) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `cache` option to `DOMRemoteReceiver` to preserve host elements

- [`894d6f3`](https://github.com/Shopify/remote-dom/commit/894d6f3396ebb2e1de7e91b1a445aa0a39195bb9) Thanks [@lemonmade](https://github.com/lemonmade)! - Return `DocumentFragment` from `DOMRemoteReceiver.disconnect()`

## 1.1.0

### Minor Changes

- [#394](https://github.com/Shopify/remote-dom/pull/394) [`22e6512`](https://github.com/Shopify/remote-dom/commit/22e6512f797d97d2106f181d730d995f37c6edaf) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `BatchingRemoteConnection` helper for batching changes to a polyfilled DOM

## 1.0.1

### Patch Changes

- [`ee5e843`](https://github.com/Shopify/remote-dom/commit/ee5e843a85c1d213420ae25cb2fc248484ca04f3) Thanks [@lemonmade](https://github.com/lemonmade)! - Force upgrade polyfill dependency to fix `createElementNS` errors

## 1.0.0

### Major Changes

- [`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf) Thanks [@lemonmade](https://github.com/lemonmade)! - First release of Remote DOM. Read more about this [refactor of remote-ui on native DOM APIs](https://github.com/Shopify/remote-dom/discussions/267), and take a look at the [updated documentation](/README.md).

### Patch Changes

- Updated dependencies [[`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf)]:
  - @remote-dom/polyfill@1.0.0

## 0.1.1

### Patch Changes

- [#268](https://github.com/Shopify/remote-dom/pull/268) [`9576a72`](https://github.com/Shopify/remote-dom/commit/9576a72fa354481621c53efde4169829fe9bfabf) Thanks [@shopify-github-actions-access](https://github.com/apps/shopify-github-actions-access)! - Send initial tree of UI elements when connecting a `RemoteRootElement`

## 0.1.0

### Minor Changes

- [`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82) Thanks [@lemonmade](https://github.com/lemonmade)! - Test minor bump

### Patch Changes

- Updated dependencies [[`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82)]:
  - @remote-dom/polyfill@0.1.0

## 0.0.2

### Patch Changes

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a) Thanks [@lemonmade](https://github.com/lemonmade)! - Test version bump

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`8e1fad4`](https://github.com/Shopify/remote-dom/commit/8e1fad4a00cfe68ff1594fbabeec10c29958685f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `root` option to `DOMRemoteReceiver`

- Updated dependencies [[`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a)]:
  - @remote-dom/polyfill@0.0.2

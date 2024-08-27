---
'@remote-dom/polyfill': minor
'@remote-dom/signals': minor
'@remote-dom/preact': minor
'@remote-dom/react': minor
'@remote-dom/core': minor
---

Added native support for synchronizing attributes and event listeners

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

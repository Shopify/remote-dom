# `@remote-dom/core`

A collection of DOM-based utilities for synchronizing elements between JavaScript environments.

## Installation

```sh
npm install @remote-dom/core --save # npm
pnpm install @remote-dom/core --save # pnpm
yarn add @remote-dom/core # yarn
```

## Usage

### `@remote-dom/core/elements`

The `@remote-dom/core/elements` package provides the classes and utility functions required to define “remote” elements. You’ll use these utilities in the sandboxed JavaScript environment that’s sending elements.

To import this entry, you must be in an environment with browser globals, including `HTMLElement` and `MutationObserver`. If you want to run your remote environment in a web worker, you can use the minimal DOM polyfill provided by [`@remote-dom/core/polyfill`](#remote-domcorepolyfill)

#### `RemoteElement`

The most important of these utilities is `RemoteElement`, which is a base class for defining elements in the remote environment. This class is a subclass of [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), and adds the ability to declare how properties and methods are synchronized between the remote and host environments.

To define a remote element, the simplest approach is to subclass `RemoteElement`, and to use the `customElements` global to associate this element with a tag name:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {}

customElements.define('my-element', MyElement);
```

##### Remote attributes

You can provide Remote DOM with a list of [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) that will be synchronized between the remote and host environments. This can be done manually by calling the `updateRemoteAttribute()` method in a custom `RemoteElement` subclass:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get observedAttributes() {
    return ['label'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'label') {
      this.updateRemoteAttribute('label', newValue);
    }
  }
}

customElements.define('my-element', MyElement);
```

Or, for convenience, by defining a static `remoteAttributes` getter:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteAttributes() {
    return ['label'];
  }
}

customElements.define('my-element', MyElement);
```

Now, when we create a `my-element` element and set its `label` attribute, the change will be communicated to the host environment.

```ts
const element = document.createElement('my-element');
element.setAttribute('label', 'Hello, world!');
```

##### Remote events

You can also provide Remote DOM with a list of [events](https://developer.mozilla.org/en-US/docs/Web/API/Event) that will be synchronized between the remote and host environments. You can register to listen for these events on the remote element using [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), and they will be registered as event listeners in the host representation of the element.

To define remote events, you can use the `remoteEvents` static getter:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteEvents() {
    return ['change'];
  }
}

customElements.define('my-element', MyElement);
```

Now, we can create a `my-element` element and add an event listener for the `change` event dispatched by the host:

```ts
const element = document.createElement('my-element');
element.addEventListener('change', () => console.log('Changed!'));
```

By default, a `RemoteEvent` object is dispatched to your remote event listeners. This object is a subclass of [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent), and sets any argument sent from the host on the `detail` property. If you’d prefer a custom event object, you can instead use the object form of `remoteEvents` to set an event’s `dispatchEvent` option, which receives the argument from the host environment, and allows you to return a custom event that will be dispatched on the element:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class ChangeEvent extends CustomEvent {
  constructor(value) {
    super('change', {detail: value});
  }
}

class MyElement extends RemoteElement {
  static get remoteEvents() {
    return {
      change: {
        dispatchEvent(value) {
          // Before calling event listeners, update some properties on the element,
          // so they can be read in event listeners.
          Object.assign(this, {value});
          return new ChangeEvent(value);
        },
      },
    };
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');
element.addEventListener('change', (event) => {
  console.log('Changed!', element.value, element.value === event.detail);
});
```

Remote events do not bubble by default. As an extension of this behavior, the remote element will not even request that the host inform it of a particular non-bubbling event, unless an event listener for that event is specifically added to the element.

To listen for events in the host regardless of whether the remote element has an event listener, you can use the `bubbles` option when defining your remote event:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteEvents() {
    return {
      change: {
        bubbles: true,
      },
    };
  }
}

customElements.define('my-element', MyElement);

const parent = document.createElement('parent-element');
const element = document.createElement('my-element');
parent.append(element);

parent.addEventListener('change', (event) => {
  console.log('Nested element changed!', event.target, event.bubbles);
});
```

##### Remote properties

Remote DOM converts an allowlist of element instance properties into a dedicated object that can be communicated to the host environment. We refer to this object as an element’s “remote properties”, and it can be used to synchronize additional state that can’t be represented by attributes or event listeners.

You can manually set an element’s remote properties by using the `updateRemoteProperty()` method:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  #label;

  get label() {
    return this.#label;
  }

  set label(value) {
    this.#label = value;
    this.updateRemoteProperty('label', value);
  }
}

customElements.define('my-element', MyElement);
```

Now, when we construct a `my-element` element and set its `label` property, the change will be communicated to the host environment.

```ts
const element = document.createElement('my-element');
element.label = 'Hello, world!';
```

Manually updating remote properties can get a little tedious. Additionally, it’s generally expected that properties can also be set as attributes, which makes it easier to construct elements using HTML. Remote DOM lets you create these attribute/ property pairs easily by indicating the name of your properties in the `remoteProperties` static getter:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteProperties() {
    return ['label'];
  }
}

customElements.define('my-element', MyElement);
```

Now, we can set the `label` property as an attribute or property, and in either case, the change will be communicated to the host environment:

```ts
const element = document.createElement('my-element');
element.setAttribute('label', 'Hello, world!');

// Or, you can use HTML to create the element and set its attribute
const template = document.createElement('template');
template.innerHTML = '<my-element label="Hello, world!"></my-element>';
```

Remote DOM allows you to define more complex remote properties that do not map to simple string attributes. Instead of setting `remoteProperties` to an array of property names, you can instead set it to an object that provides more details on how to coordinate the attribute, property, and remote property values:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteProperties() {
    return {
      label: {type: String},
      emphasized: {type: Boolean},
      onPress: {event: true},
    };
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');
element.setAttribute('label', 'Hello, world!');
element.emphasized = true;
element.addEventListener('press', () => console.log('Pressed!'));
```

Each property definition can have the following options:

**`type`: The type of the property.** This is used to convert the attribute value to the property value, and vice versa. You can pass any of the following values for this option:

- `String`: The default type. The property value is a string, and will be directly mirrored between attribute and property values.
- `Number`: Converts an attribute value to a number before assigning it to the property.
- `Boolean`: Converts an attribute value to a boolean before assigning it to the property. If the attribute is present, the property will be `true`; otherwise, it will be `false`.
- `Array` or `Object`: Processes an attribute with `JSON.parse()` before assigning it to the property.
- `Function`: Prevents the attribute from being assigned.
- An object with optional `parse()` and `serialize()` methods, which are used to convert the attribute value to the property value, and to serialize the property value to a remote property, respectively.

**`attribute`: whether this property maps to an attribute.** If `true`, which is the default, Remote DOM will set this property value from an attribute with the same name. The `type` option is used to determine how the attribute value is converted to the property value. You can choose an attribute name that differs from the property name by setting this option to a string, instead of `true`.

> **Note:** If you want to use the attribute as the “source of truth” for the property value, > you should use a [remote attribute](#remote-attributes) instead of a remote property.

**`event`: whether this property maps to an event listener.** If `true`, Remote DOM will set the property value to a function if any event listeners are set for the matching event name.

> **Note:** This feature is deprecated. You should use [`remoteEvents`](#remote-events) to define
> event listeners that will be synchronized with the host environment.

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteProperties() {
    return {
      onPress: {event: true},
    };
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');

// Adding an event listener that maps to the `onPress` property:
element.addEventListener('press', () => console.log('Pressed!'));

// Alternatively, directly setting the remote property:
element.onPress = () => console.log('Pressed!');
```

The event name is the name of the property with the `on` prefix removed, and converted to kebab-case. For example, `onPressStart` would be mapped to a `press-start` event. Alternatively, you can set the `event` option to a string to explicitly set the event name:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteProperties() {
    return {
      onPressStart: {event: 'pressstart'},
    };
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');

element.addEventListener('pressstart', () => console.log('Pressed!'));
```

When a remote element uses event listeners to define remote properties, those event listeners will be called with a special `RemoteEvent` object. This object is like the normal `Event` object, but it has a few special properties:

- `detail`: set to the first argument passed by the caller of the remote property.
- `response`: set to the last value passed to the `respondWith()` method. After all event listeners have run, this value is returned to the caller of the remote property.
- `respondWith()`: Sets a value to be returned to the caller of the remote property.

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteProperties() {
    return {
      onSave: {event: true},
    };
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');

element.addEventListener('save', (event) => {
  // Argument passed to the `onSave()` remote property
  console.log(event.detail);

  // Return a promise
  event.respondWith(
    (async () => {
      // Do something asynchronous
      await doSomething();

      // Return a value to the caller of the remote property
      return {success: true};
    })(),
  );
});
```

##### Remote methods

Remote DOM also lets you define methods in the host environment that can be called from the remote environment. You can call these methods using the `callRemoteMethod()` function:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  focus() {
    return this.callRemoteMethod('focus');
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');
element.focus();
```

It’s common that a method in your `RemoteElement` subclass will just call through to a remote method with a matching name, like the `focus()` method above. In those cases, you can instead define a `remoteMethods` static getter to automatically create these methods:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class MyElement extends RemoteElement {
  static get remoteMethods() {
    return ['focus'];
  }
}

customElements.define('my-element', MyElement);

const element = document.createElement('my-element');
element.focus();
```

#### `createRemoteElement`

`createRemoteElement` lets you define a remote element class without having to subclass `RemoteElement`. Instead, you’ll just provide the remote `properties`, `attributes`, `events`, and `methods` for your element as options to the function:

```ts
import {createRemoteElement} from '@remote-dom/core/elements';

const MyElement = createRemoteElement({
  attributes: ['label'],
  events: ['change']
  properties: {
    emphasized: {type: Boolean},
  },
  methods: ['focus'],
});

customElements.define('my-element', MyElement);
```

When using TypeScript, you can pass the generic type arguments to `createRemoteElement` to define the property and method types for your element. This ensures that, when you create your element instance, the properties and methods are properly typed:

```ts
import {createRemoteElement} from '@remote-dom/core/elements';

interface MyElementAttributes {
  label?: string;
}

interface MyElementProperties {
  emphasized?: boolean;
}

interface MyElementEvents {
  change(event: CustomEvent): void;
}

interface MyElementMethods {
  focus(): void;
}

const MyElement = createRemoteElement<
  MyElementProperties,
  MyElementMethods,
  {},
  MyElementEvents
>({
  attributes: ['label'],
  events: ['change']
  properties: {
    emphasized: {type: Boolean},
  },
  methods: ['focus'],
});

customElements.define('my-element', MyElement);
```

#### `RemoteMutationObserver`

Remote DOM needs some way to detect that changes have happened in a remote element, in order to communicate those changes to the host environment. If you’re polyfilling the DOM with [`@remote-dom/core/polyfill`](#remote-domcorepolyfill), this is handled for you. However, when operating in other environments, like an `iframe` with a native DOM, you’ll need something that can track these changes.

The `RemoteMutationObserver` class builds on the browser’s [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to detect changes in a remote element, and to communicate those changes in a way that Remote DOM can understand. You create this object from a “remote connection”, which you’ll generally get from the [`@remote-dom/core/receiver`](#remote-domcorereceiver) package. Then, you’ll observe changes in the HTML element that contains your tree of remote elements.

```ts
import {RemoteMutationObserver} from '@remote-dom/core/elements';

const observer = new RemoteMutationObserver(connection);

// Now, any changes to the `body` element will be communicated
// to the host environment.
observer.observe(document.body);
```

#### `RemoteRootElement`

The `RemoteRootElement` is a custom `HTMLElement` subclass that can be used to define the root of a tree of custom elements that will be synchronized with the host environment. Unlike `RemoteMutationObserver`, `RemoteRootElement` **only** works in an environment polyfilled using `@remote-dom/core/polyfill`. Once created, you should pass a “remote connection” to the `connect()` method, which will start the synchronization process:

```ts
import {RemoteRootElement} from '@remote-dom/core/elements';

// Remote DOM does not define this element, so you can give it a
// name of your choice. We recommend using `remote-root`.

customElements.define('remote-root', RemoteRootElement);

const root = document.createElement('remote-root');

// Now, any changes to this elements descendants will be communicated
// to the host environment.
root.connect(connection);
```

#### `BatchingRemoteConnection`

The `RemoteConnection` object you receive from `RemoteReceiver.connection` is a simple object that immediately communicates all updates to the host environment. When using `RemoteMutationObserver`, documented above, this is not a major issue, since the `MutationObserver` API automatically batches DOM mutations. However, it can be more of a problem when using Remote DOM in a web worker (typically, with the `RemoteRootElement` wrapper), where no such batching is performed.

To improve performance in these cases, you can use the `BatchingRemoteConnection` class, which batches updates from the remote environment that happen in the same JavaScript task. This class is a subclass of `RemoteConnection`, and can be used directly in place of the original connection object:

```ts
import {
  BatchingRemoteConnection,
  RemoteRootElement,
} from '@remote-dom/core/elements';

customElements.define('remote-root', RemoteRootElement);

const root = document.createElement('remote-root');

root.connect(new BatchingRemoteConnection(connection));
```

#### `RemoteFragmentElement`

Some APIs in [`@remote-dom/preact`](../preact) and [`@remote-dom/react`](../react) need to create an HTML element as a generic container. This element is not defined by default, so if you use these features, you must define a matching custom element for this container. Remote DOM calls this element `remote-fragment`, and you can define this element using the `RemoteFragmentElement` constructor:

```ts
import {RemoteFragmentElement} from '@remote-dom/core/elements';

customElements.define('remote-fragment', RemoteFragmentElement);
```

### `@remote-dom/core/receivers`

A “remote receiver” collects updates that happened in a remote environment, and reconstructs them in a way that allows them to be rendered in the host environment.

This library provides two kinds of receiver: [`RemoteReceiver`](#remotereceiver), which converts the remote elements into a basic JavaScript representation, and [`DOMRemoteReceiver`](#domremotereceiver), which converts remote elements into matching DOM elements.

#### `RemoteReceiver`

A `RemoteReceiver` stores remote elements into a basic JavaScript representation, and allows subscribing to individual elements in the remote environment. This can be useful for mapping remote elements to components in a JavaScript framework; for example, the [`@remote-dom/react` library](../react#remoterenderer) uses this receiver to map remote elements to React components.

An empty remote receiver can be created using the `RemoteReceiver` constructor:

```ts
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();
```

To support functions being passed over `postMessage`, you may need a way to manually manage memory for remote properties as they are received. `RemoteReceiver` lets you accomplish this by passing the `retain` and `release` options to the constructor, which are called when new remote properties are received and when they are overwritten, respectively:

```ts
// This library is not included with Remote DOM, but it pairs
// well with it in allowing you to pass functions between
// JavaScript environments without leaking memory, by manually
// managing the memory for those functions.
import {retain, release} from '@quilted/threads';
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver({retain, release});
```

##### `RemoteReceiver.connection`

Each `RemoteReceiver` has a `connection` property, which can be passed to a [`RemoteMutationObserver`](#remotemutationobserver) or [`RemoteRootElement`](#remoterootelement) in the remote environment. This object, which the library refers to as a `RemoteConnection`, is responsible for communicating changes between the remote environment and host environments.

```ts
// In the host environment:
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();

// In the remote environment:
import {RemoteMutationObserver} from '@remote-dom/core/elements';

const observer = new RemoteMutationObserver(receiver.connection);
```

##### `RemoteReceiver.root`

Each `RemoteReceiver` also has a `root` property, which defines the object that all remote element representations will be attached to. This object has a `children` property, which will contain child text and element nodes, which may themselves have additional children.

```ts
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();
const root = receiver.root;
// {
//   children: [],
//   version: 0,
//   ...
// }
```

##### `RemoteReceiver.subscribe()`

`RemoteReceiver.subscribe()` allows you to subscribe to changes in a remote element. This includes changes to the remote element’s properties and list of children, but note that you will not receive updates for properties or children of _nested_ elements.

The first argument to this function is the remote element you want to subscribe to, and the second is a function that will be called with the updated description of that element on each change:

```ts
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();

// Subscribe to all changes in the top-level children, attached
// directly to the remote “root”.
receiver.subscribe(receiver.root, (root) => {
  console.log('Root changed!', root);
});
```

You can pass a third options argument to the `subscribe()` method. Currently, only one option is available: `signal`, which lets you pass an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that will be used to cancel the subscription:

```ts
import {RemoteReceiver} from '@remote-dom/core/receivers';

const abort = new AbortController();
const receiver = new RemoteReceiver();

// Subscribe to all changes in the top-level children, attached
// directly to the remote “root”.
receiver.subscribe(
  receiver.root,
  (root) => {
    console.log('Root changed!', root);
  },
  {signal: abort.signal},
);

// Stop listening in 10 seconds
setTimeout(() => {
  abort.abort();
}, 10_000);
```

##### `RemoteReceiver.implement()`

`RemoteReceiver.implement()` lets you define how [remote methods](#remote-methods) are implemented for a particular element. The first argument to this method is the element you want to implement methods for, and the second is an object that provides the implementation for each supported method.

For example, in the example below, we implement a `alert()` method on the root element, which can then be called from the remote environment:

```ts
// In the host environment:
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();

receiver.implement(receiver.root, {
  alert(message) {
    window.alert(message);
  },
});

// In the remote environment:
import {RemoteRootElement} from '@remote-dom/core/elements';

customElements.define('remote-root', RemoteRootElement);

const root = document.createElement('remote-root');
root.connect(receiver.connection);

root.callRemoteMethod('alert', 'Hello, world!');
```

##### `RemoteReceiver.get()`

`RemoteReceiver.get()` fetches the latest state of a remote element that has been received from the remote environment.

```ts
import {RemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new RemoteReceiver();

receiver.get(receiver.root) === receiver.root; // true
```

#### `DOMRemoteReceiver`

`DOMRemoteReceiver` takes care of mapping remote elements to matching HTML elements on the host page. If you implement your UI with [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements), `DOMRemoteReceiver` is a simple option that avoids much of the manual work required when using the basic `RemoteReceiver`.

An empty remote receiver can be created using the `DOMRemoteReceiver` constructor. You’ll then call the `connect()` method with the HTML element that will serve as your “root” element, to which all the synchronized remote elements will be attached:

```ts
import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new DOMRemoteReceiver();

// Any custom elements created in the remote environment will
// be attached to the `body` element.
receiver.connect(document.body);
```

Like with `RemoteReceiver`, you can pass the `retain` and `release` options to the constructor to manually manage memory for remote properties as they are received:

```ts
// This library is not included with Remote DOM, but it pairs
// well with it in allowing you to pass functions between
// JavaScript environments without leaking memory, by manually
// managing the memory for those functions.
import {retain, release} from '@quilted/threads';
import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new DOMRemoteReceiver({retain, release});
```

##### Caching DOM nodes

By default, `DOMRemoteReceiver` will create a new DOM node each time a remote element is attached to a new parent, which is done to release memory related to the remote environment as quickly as possible. However, this can be inefficient if you’re frequently moving elements between different parents, as this “re-parenting” will create separate elements on the host page each time the parent is changed. If this is a case you need to optimize for, you can pass the `cache.maxAge` option to the `DOMRemoteReceiver` constructor, which will re-use an existing host element representing a remote element when the remote element is re-attached within the specified number of milliseconds:

```ts
import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new DOMRemoteReceiver({
  // Preserve host elements for 1 second after they are
  // detached from the tree
  cache: {maxAge: 1_000},
});
```

##### `DOMRemoteReceiver.connection`

Like `RemoteReceiver`, each `DOMRemoteReceiver` has a `connection` property, which can be passed to a [`RemoteMutationObserver`](#remotemutationobserver) or [`RemoteRootElement`](#remoterootelement) in the remote environment.

```ts
// In the host environment:
import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

const receiver = new DOMRemoteReceiver();

// In the remote environment:
import {RemoteMutationObserver} from '@remote-dom/core/elements';

const observer = new RemoteMutationObserver(receiver.connection);
```

##### `DOMRemoteReceiver.root`

Each `DOMRemoteReceiver` has a `root` property. If you’ve called `connect()` on your receiver, this property will be the HTML element that you passed to that method. Otherwise, it will be a [`DocumentFragment`](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment) that stores remote elements before you’ve selected the host element to attach them to.

### `@remote-dom/core/polyfill`

The `@remote-dom/core/polyfill` package provides a minimal DOM polyfill that can be used to run remote elements in a web worker, and automatically communicates changes in that DOM to a host environment, if it has been connected by a [`RemoteRootElement`](#remoterootelement). This polyfill builds on top of the small, hook-able DOM polyfill provided by [`@remote-dom/polyfill`](../polyfill/).

To use this polyfill, import it before any other code that might depend on DOM globals:

```ts
import '@remote-dom/core/polyfill';
import {RemoteElement} from '@remote-dom/core/elements';

// ...
```

### `@remote-dom/core/html`

The `@remote-dom/core/html` package provides a helper function for creating DOM elements from tagged template literals. This lets you create large quantities of DOM elements, with intelligent handling of element properties, and supports minimal “components” for packaging up reusable DOM structures.

```ts
import {html} from '@remote-dom/core/html';

function MyButton() {
  return html`<ui-button
    onClick=${() => {
      console.log('Pressed!');
    }}
    >Click me!</ui-button
  >`;
}

const html = html`
  <ui-stack spacing>
    <ui-text>Hello, world!</ui-text>
    <${MyButton} />
  </ui-stack>
` satisfies HTMLElement;
```

This helper uses the following logic to determine whether a given property in the template should map to an attribute, property, or event listener:

- If the property is an instance member of the element, it will be set as a property.
- If the property is an HTML element, it will be appended as a child in a slot named the same as the property (e.g., `<ui-button modal=${html`<ui-modal />`}>` becomes a `ui-modal` child with a `slot="modal"` attribute).
- If the property starts with `on`, the value will be set as an event listener, with the event name being the lowercased version of the string following `on` (e.g., `onClick` sets a `click` event).
- Otherwise, the property will be set as an attribute.

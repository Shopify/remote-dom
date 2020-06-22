# `@remote-ui/dom`

This library provides utilities to render the host side of a [`@remote-ui/core` `ReactRoot`](../core#remoteroot) into the DOM by mapping remote components to [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).

## Installation

Using `yarn`:

```
yarn add @remote-ui/dom
```

or, using `npm`:

```
npm install @remote-ui/dom --save
```

## Usage

This library provides a custom remote “receiver”, `DomReceiver`. This object is a replacement for the generic [`@remote-ui/core` `RemoteReceiver`](../core#remotereceiver). It implements an optimized approach for mapping updates on a [`RemoteRoot`](../core#remoteroot) to the DOM, where any `RemoteText` objects become `Text` nodes in the DOM, and any `RemoteComponent` objects become custom element instances.

Before you can render anything to the DOM, you must provide one argument to the `DomReceiver`: `customElement`. This option is used to determine what custom element to create for a given remote component. It can be an object or `Map`, where the keys are names of remote components, and values are the name of the custom element; or a function that accepts the name of the component as its argument, and returns the name of the custom element.

```ts
import {DomReceiver} from '@remote-ui/dom';

const receiver = new DomReceiver({
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
});
```

Once you have an instance of the receiver, you can use its `receive` method to connect it to a new `RemoteRoot` object:

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {DomReceiver} from '@remote-ui/dom';

const {receive} = new DomReceiver({
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
});

// Somewhere else, usually in a “remote context” like a web worker.

const remoteRoot = createRemoteRoot(receive);
```

You also need to tell the receiver what node to “bind” to. When a receiver is bound to a node, all of the current top-level children of the `RemoteRoot` will be appended to that node, and any subsequent root updates will also be applied to that node. You can bind a node, which can be an HTML element, document fragment, shadow root, or any other object satisfying the [`Node` interface](https://developer.mozilla.org/en-US/docs/Web/API/Node), by passing it to the constructor as the `bind` option, or by subsequently calling the `bind()` method on `DomReceiver`.

```ts
import {DomReceiver} from '@remote-ui/dom';

const root = document.querySelector('#root');

const receiver = new DomReceiver({
  bind: root,
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
});

// or...

receiver.bind(root);
```

If you want to remove the bound node’s connection to the `RemoteRoot`, you can call `unbind()` on the `DomReceiver`. This will empty the node and disconnect it from future updates to the `RemoteRoot`.

```ts
import {DomReceiver} from '@remote-ui/dom';

const root = document.querySelector('#root');

const receiver = new DomReceiver({
  bind: root,
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
});

// later...

receiver.unbind();
```

By default, all props on a remote component are directly applied as properties to the matching custom element. This is the simplest behavior that is guaranteed to work for all the types that can be passed as props from a remote component (strings, numbers, booleans, objects, arrays, and functions). However, you can customize way a property is applied to its custom element by passing the `applyProperty` option. This option is passed the custom element being created, the name of the property being applied, the value for that property, and the `type` of the remote component. You can use these details to change the behavior on a per-prop basis; for instance, using attributes instead of properties in some cases, or attaching event listeners. If this function returns `false`, the default logic for applying a property will be used instead.

```ts
import {DomReceiver} from '@remote-ui/dom';

const root = document.querySelector('#root');

const receiver = new DomReceiver({
  bind: root,
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
  // For the `disabled` property on Button, we will use an HTML attribute.
  applyProperty({type, element, property, value}) {
    if (type !== 'Button' || property !== 'disabled') return false;
    element.setAttribute('disabled', 'disabled');
  },
});
```

One particularly common way to customize custom elements is to turn some function properties into native DOM event listeners. You can pass the `withEventListeners` function from this package to `applyProperty` to automatically convert any prop starting with `on` into an event listener, and otherwise using the default property setting logic noted above.

```ts
import {DomReceiver, withEventListeners} from '@remote-ui/dom';

const root = document.querySelector('#root');

const receiver = new DomReceiver({
  bind: root,
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
  applyProperty: withEventListeners,
});

// Now, if we have a remote component that creates a `Button` component with an
// `onPress` prop, that will become a `ui-button` custom element, with an
// `addEventListener('press', props.onPress)` applied to it.
```

### As a custom element

This library also provides a small custom element meant to make this library feel more ergonomic in larger, custom element-based apps. This custom element is registered for the name `remote-ui-root`. In environments that support custom elements, you can use this element in your HTML like so:

```html
<remote-ui-root></remote-ui-root>
```

You’ll then need to ensure you load the definition for this component, find its node in the DOM, and update its `receiver` prop. Whenever the `receiver` prop updates to a new `DomReceiver`, this custom element will bind its own shadow root as the top-level element for the `RemoteRoot`. You can accomplish this using just a few lines of JavaScript:

```ts
import {DomReceiver} from '@remote-ui/dom/browser';

const receiver = new DomReceiver({
  customElement: {
    Card: 'ui-card',
    Button: 'ui-button',
  },
});

document.querySelector('remote-ui-root').receiver = receiver;

// Somewhere else, you construct the `RemoteRoot` and start rendering to it,
// and those updates will be reflected in the shadow root of this custom
// element.
```

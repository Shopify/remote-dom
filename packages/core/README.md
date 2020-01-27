# `@remote-ui/core`

This library provides the core model for implementing a remote representation of a UI, and for signalling operations on that representation to another context via a small message channel. For a full overview of how `@remote-ui/core` fits in to the different pieces of Remote UI, you can refer to our [comprehensive example](../../#example).

## Installation

Using `yarn`:

```
yarn add @remote-ui/core
```

or, using `npm`:

```
npm install @remote-ui/core --save
```

## Usage

`@remote-ui/core` provides two main exports. You’ll use [`RemoteRoot`](#createremoteroot) in the remote environment to construct a tree for attaching UI components, and [`RemoteReceiver`](#remotereceiver) on the host to react to changes in the remote root.

### `createRemoteRoot()`

`createRemoteRoot()` creates the local representation of the UI a developer will interact with from a remote context. This root exposes a DOM-like API for creating and updating components that are attached to the root.

This function accepts two arguments:

- `channel` is a `RemoteChannel`, which is just a function that will be called with serialized representation of UI updates. [`RemoteReceiver#receive`](#remotereceiverreceive) is one such function, and most uses of Remote UI will just pass that function here.
- `options` is an optional options object. There is currently one supported option: `components`. This value is the list of components that can be constructed and attached to this root. This is necessary because, by default, this library does not supply any components to render; you are responsible for implementing a component API that makes sense for your use case.

```ts
import {createRemoteRoot, RemoteReceiver} from '@remote-ui/core';

const {receive} = new RemoteReceiver();

const root = createRemoteRoot(receive, {
  components: ['Button', 'TextField', 'Card'],
});
```

#### `RemoteRoot`

The output of `createRemoteRoot` is a `RemoteRoot`. This object has methods methods for mutating the tree:

##### `RemoteRoot#createText()`

`createText` creates a [`RemoteText` instance](#remotetext). All text rendered to the UI needs to be represented as a `RemoteText` instance (component properties are still just strings). You can pass an initial text content as part of this method.

```ts
const text = root.createText('Hello world!');
```

##### `RemoteRoot#createComponent()`

`createComponent` creates a [`RemoteComponent` instance](#remotecomponent). These objects represent the UI components on the host. You must pass a component type (which will be validated against allowed components), and you must also pass initial properties, if there are non-optional properties in the component.

```ts
const button = root.createComponent('Button', {
  onPress() {
    console.log('Pressed!');
  },
});
```

##### `RemoteRoot#appendChild()`

This method appends a `RemoteComponent` or `RemoteText` to the remote root as the last child. This method returns a promise for when the update has been flushed to the host.

```ts
const card = root.createComponent('Card');
root.appendChild(card);
```

##### `RemoteRoot#insertChildBefore()`

This method inserts a `RemoteComponent` or `RemoteText` in the remote root before the specified child. This method returns a promise for when the update has been flushed to the host.

```ts
const card = root.createComponent('Card');
const earlierCard = root.createComponent('Card');
root.appendChild(card);
root.insertChildBefore(earlierCard, card);
```

##### `RemoteRoot#removeChild()`

This method removes a `RemoteComponent` or `RemoteText` from the remote root. This method returns a promise for when the update has been flushed to the host.

```ts
const card = root.createComponent('Card');
root.appendChild(card);

// later...

root.removeChild(card);
```

##### `RemoteRoot#children`

The `children` property is a readonly listing of the components mounted to the tree. It does not necessarily represent the state of the host, as updates are reflected immediately in the tree, even though they take some time to be sent and applied to the host.

##### `RemoteRoot#mount()`

The `mount` method flushes the initial tree to the host. Before `mount` is called, updates are not sent to the host, which allows you to build up the entire initial tree instead of serializing each operation.

```ts
const card = root.createComponent('Card');
root.appendChild(card);
root.mount();
```

#### `RemoteComponent`

The `Root#createComponent` method creates a representation of a host UI component. This representation just shows the type of the component and its properties. Remote components can’t currently have any other methods, so all APIs will need to be implemented in terms of component properties. These objects also have a set of methods and properties for reading and mutating their state in the tree, which are documented below.

##### `RemoteComponent#type`

The type of the component. This is a string, and must be one of the allowed components for the `RemoteRoot` that constructed the component.

##### `RemoteComponent#props`

The current properties of the component. This representation is not mutable, so changing any value on this object will have no effect (use `updateProps` instead).

##### `RemoteComponent#children`

A readonly array of `RemoteComponent` and `RemoteText` objects that are direct children of this component.

##### `RemoteComponent#root`

A readonly reference to the root that constructed this component.

##### `RemoteComponent#parent`

A readonly reference to the parent of this component in the tree (or `null`, if it has no parent).

##### `RemoteComponent#updateProps()`

Updates the properties for the component. Properties are updated using a simple merge of current and new properties; it will not deeply merge any array or object properties. You can provide any subset of the available properties to this call. To delete a property, set its value to `undefined`.

```ts
const button = root.createComponent('Button', {onPress: doSomething});

if (SHOULD_BE_DISABLED) {
  button.updateProps({
    onPress: undefined,
  });
} else if (SHOULD_DO_SOMETHING_ELSE) {
  button.updateProps({
    onPress: doSomethingElse,
  });
}
```

##### `RemoteComponent#appendChild()`

Just like [`RemoteRoot#appendChild`](#remoterootappendchild), but appending a child for a single component rather than the root.

##### `RemoteComponent#insertChildBefore()`

Just like [`RemoteRoot#insertChildBefore`](#remoterootinsertchildbefore), but inserting a child for a single component rather than the root.

##### `RemoteComponent#removeChild()`

Just like [`RemoteRoot#removeChild`](#remoterootremovechild), but removing a child for a single component rather than the root.

#### `RemoteText`

A `RemoteText` object represents a text element being rendered to the host UI. It has the following properties and methods:

##### `RemoteComponent#text`

The current text content of the element. This representation is not mutable, so changing any value on this object will have no effect (use `updateText` instead)

##### `RemoteComponent#root`

A readonly reference to the root that constructed this component.

##### `RemoteComponent#parent`

A readonly reference to the parent of this component in the tree (or `null`, if it has no parent).

##### `RemoteComponent#updateText()`

Updates the text content.

```ts
const text = root.createText('Hello');

if (LOCALE === 'fr') {
  text.setText('Bonjour');
}
```

### `RemoteReceiver`

### `createRemoteComponent`

### Other exports

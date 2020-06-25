# `@remote-ui/core`

This library provides the core model for maintaining a tree of UI components, and for communicating operations on that tree to another context through tiny messages. For a full overview of how `@remote-ui/core` fits in to the different pieces of remote-ui, you can refer to our [comprehensive example](../../documentation/comprehensive-example.md).

## Installation

Using `yarn`:

```
yarn add @remote-ui/core
```

or, using `npm`:

```
npm install @remote-ui/core --save
```

## Prerequisites

`@remote-ui/core` uses JavaScript’s native `Map`, `Set`, `Promise`, and `WeakSet`. It also uses numerous language constructs that require the `Symbol` global. Polyfills for these features (via [`core-js`](https://github.com/zloirock/core-js)) are imported automatically with the “default” version of this package. If you have a build system that is smart about adding polyfills, you can configure it to [prefer (and process) a special build meant to minimize polyfills](../documentation/guides/polyfills.md).

## Usage

`@remote-ui/core` provides two main exports. You’ll use [`createRemoteRoot`](#createremoteroot) in the “remote” environment — where the source of truth for your UI will live — to construct a tree of UI components. If you are writing an application that will “host” these remote contexts, you’ll also use [`RemoteReceiver`](#remotereceiver) in that application to respond to updates from the remote context.

### `createRemoteRoot()`

`createRemoteRoot()` creates the local representation of the UI a developer will interact with from a remote context. This root exposes a DOM-like API for creating and updating components that are attached to the root.

This function accepts two arguments:

- `channel` is a `RemoteChannel`, a function that will be called with serialized representation of UI updates. [`RemoteReceiver#receive`](#remotereceiverreceive) is one such function, and most uses of remote-ui will rely on connecting those two “sides” by passing the `receive` method for this argument.
- `options` is an optional options object. There is currently one supported option: `strict`, which is enabled by default. When enabled, all `props` and `children` for remote components will be frozen (with `Object.freeze()`) in order to prevent direct mutation of those values (to prevent unexpected behavior, all mutations to these values should be done with the [`RemoteComponent`](#remotecomponent) API). The default `strict`ness also prevents potentially-untrusted code from adding properties or children that it is not supposed to. However, `Object.freeze` does have a small runtime cost, so if you are comfortable without this safety, you can disable it by passing `strict: false`:

```ts
import {createRemoteRoot, RemoteReceiver} from '@remote-ui/core';

const receiver = new RemoteReceiver();

const root = createRemoteRoot(receiver.receive, {
  strict: false,
});
```

#### `RemoteRoot`

The output of `createRemoteRoot` is a `RemoteRoot`. This object has methods methods for mutating the tree:

##### `RemoteRoot#createText()`

`createText` creates a [`RemoteText` instance](#remotetext). All text rendered to the UI needs to be represented as a `RemoteText` instance (component properties are still just strings). You can pass an initial text content as the first argument to this method.

```ts
const text = root.createText('Hello world!');
```

##### `RemoteRoot#createComponent()`

`createComponent` creates a [`RemoteComponent` instance](#remotecomponent). These objects represent the UI components on the host. You must pass a component type and any initial properties, if there are non-optional properties for the component.

```ts
const button = root.createComponent('Button', {
  onPress() {
    console.log('Pressed!');
  },
});
```

If you are familiar with React, or if the “host” side of these components is implemented in React, you may be tempted to pass a function as the `children` prop. This pattern is commonly referred to as “render props” in React. However, this pattern likely is not doing what you think it is. Remember that functions passed as props will always be asynchronous when called by the host, because they are implemented with message passing. This makes them poorly suited for rendering UI, where you generally need to run synchronous functions.

To prevent this kind of mistake, any `children` prop will be deleted from the props object. If you want to implement a render prop-style API, you can do so without potentially causing confusion by using a different prop name, and ensuring that you handle the fact that the host will receive a promise whenever they call this function. If you are just trying to append other `RemoteComponent` and `RemoteText` instances to your tree, use `RemoteComponent#appendChild()`.

`createComponent` also accepts a third argument: an array of children. This can be used to construct a tree of components without requiring intermediate variables.

```ts
root.appendChild(
  root.createComponent('BlockStack', undefined, [
    root.createComponent(
      'Button',
      {
        onPress() {
          console.log('Pressed!');
        },
      },
      ['Press me!'],
    ),
  ]),
);
```

##### `RemoteRoot#appendChild()`

This method appends a `RemoteComponent` or `RemoteText` to the remote root as the last child. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
root.appendChild(card);
```

##### `RemoteRoot#insertChildBefore()`

This method inserts a `RemoteComponent` or `RemoteText` in the remote root before the specified child. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
const earlierCard = root.createComponent('Card');
root.appendChild(card);
root.insertChildBefore(earlierCard, card);
```

##### `RemoteRoot#removeChild()`

This method removes a `RemoteComponent` or `RemoteText` from the remote root. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
root.appendChild(card);

// later...

root.removeChild(card);
```

##### `RemoteRoot#children`

The `children` property is a readonly list of the components mounted to the tree. It does not necessarily represent the state of the host, as updates are reflected immediately to the local tree of components, but can be applied asynchronously in the host.

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
  text.updateText('Bonjour');
}
```

### `RemoteReceiver`

The opposite side of a `RemoteRoot` is a `RemoteReceiver`. This object can accept the UI updates from the remote context and reconstruct them into an observable tree on the host. This tree can then be used to render the components to their native representation in the host (in a web application, this representation is the DOM).

```ts
import {RemoteReceiver} from '@remote-ui/core';

const receiver = new RemoteReceiver();
```

The `RemoteReceiver` instance has a number of properties and methods to connect it to a remote root, and to allow other objects to subscribe to updates. The full API is documented below.

#### `RemoteReceiver#root`

The `root` property is a readonly representation of the state of the remote root. You can use this property to get the initial set of components that are children of the root.

```ts
import {RemoteReceiver} from '@remote-ui/core';

const receiver = new RemoteReceiver();

for (const child of receiver.root.children) {
  console.log(child);
}
```

#### `RemoteReceiver#receive()`

The `receive` method is a function that can be used as the first argument to the `createRemoteRoot` function. Passing this function to the remote root will cause all updates from that root to be reflected in the `RemoteReceiver`.

```ts
import {RemoteReceiver, createRemoteRoot} from '@remote-ui/core';

const receiver = new RemoteReceiver();
const root = createRemoteRoot(receiver.receive);
```

#### `RemoteReceiver#listen()`

The `listen` method registers a listener to run whenever a component in the tree changes, including the addition or removal of children, the changing of component properties, and the changing of remote text values. The first argument is the element to listen for, and the second is a function that will be invoked every time that element changes for any reason. This method returns a function that can be called to stop listening for updates.

```ts
import {RemoteReceiver} from '@remote-ui/core';

const receiver = new RemoteReceiver();
const seen = new WeakMap();

receiver.listen(receiver.root, (root) => {
  console.log('Root changed!');

  for (const child of root.children) {
    if (seen.has(child)) continue;

    receiver.listen(child, (child) => {
      console.log('A root child changed!');
    });
  }
});
```

Host implementations can use this method to update their representation of the UI in response to changes from the remote context. A simple implementation would listen for changes to the root and, when it changes, listen for changes in any new children. It would then update its tree to match the remote root (remove components no longer present in the `children` property, for example), and schedule the update to be rendered. The [`@remote-ui/react` package](../react) is implemented by using this object and mapping it to React state.

### `createRemoteComponent`

By default, “native” components are referenced by their string name, like `'Button'` or `'Card'`. However, this library provides a way of attaching additional meaning to components, like the TypeScript types for the available component properties. This more formal creation of a remote component is accomplished with the `createRemoteComponent()` utility.

This function accepts only one argument: the (string) name of the component.

The function also accepts a set of generic type arguments that let you enforce some metadata about the component in TypeScript. The first type argument is the name of the component, the second is the type of the props available for the component, and the third is the components that are allowed to be direct children of this one (by default, all component types are allowed).

```ts
import {createRemoteComponent} from '@remote-ui/core';

const Button = createRemoteComponent<
  'Button',
  {onPress?(): void | Promise<void>}
>('Button');

const CardSection = createRemoteComponent<'CardSection'>('CardSection');
const Card = createRemoteComponent<'Card', {title: string}, typeof CardSection>(
  'Card',
);
```

These types are used to validate the passed arguments in `RemoteRoot#createComponent`, `RemoteRoot#appendChild`, and the other mutation APIs. With the example above, TypeScript would complain about the following calls, because we are not providing the mandatory `title` prop to `createComponent`, and we are appending a component other than `CardSection` to `Card`.

```ts
import {createRemoteRoot} from '@remote-ui/core';

const root = createRemoteRoot(/* ... */);
const button = root.createComponent(Button, {
  onPress: () => console.log('Clicked!'),
});
const card = root.createComponent(Card);
card.appendChild(button);
```

### Other exports

This package exports a variety of helper types for easy access in more complex use cases, including some types representing the wire format remote-ui uses to communicate component tree updates. It also re-exports the [`retain` and `release` methods from `@remote-ui/rpc`](../rpc), and the [helper TypeScript types from `@remote-ui/types`](../types), for easy access.

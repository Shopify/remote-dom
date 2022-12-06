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

`@remote-ui/core` provides two main exports. You’ll use [`createRemoteRoot`](#createremoteroot) in the “remote” environment — where the source of truth for your UI will live — to construct a tree of UI components. If you are writing an application that will “host” these remote contexts, you’ll also use [`createRemoteReceiver`](#createremotereceiver) in that application to respond to updates from the remote context.

### `createRemoteRoot()`

`createRemoteRoot()` creates the local representation of the UI a developer will interact with from a remote context. This root exposes a DOM-like API for creating and updating components that are attached to the root.

This function accepts two arguments:

- `channel` is a `RemoteChannel`, a function that will be called with serialized representation of UI updates. [`RemoteReceiver#receive`](#remotereceiverreceive) is one such function, and most uses of remote-ui will rely on connecting those two “sides” by passing the `receive` method for this argument.
- `options` is an optional options object. There is currently one supported option: `strict`, which is enabled by default. When enabled, all `props` and `children` for remote components will be frozen (with `Object.freeze()`) in order to prevent direct mutation of those values (to prevent unexpected behavior, all mutations to these values should be done with the [`RemoteComponent`](#remotecomponent) API). The default `strict`ness also prevents potentially-untrusted code from adding properties or children that it is not supposed to. However, `Object.freeze` does have a small runtime cost, so if you are comfortable without this safety, you can disable it by passing `strict: false`:

```ts
import {createRemoteRoot, createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();

const root = createRemoteRoot(receiver.receive, {
  strict: false,
});
```

#### `RemoteRoot`

The output of `createRemoteRoot` is a `RemoteRoot`. This object has methods for mutating the tree:

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

To prevent this kind of mistake, any `children` prop will be deleted from the props object. If you want to implement a render prop-style API, you can do so without potentially causing confusion by using a different prop name, and ensuring that you handle the fact that the host will receive a promise whenever they call this function. If you are just trying to append other `RemoteComponent` and `RemoteText` instances to your tree, use `RemoteComponent#append()`.

`createComponent` also allows you to pass initial children for the created component. If you have only one child, you can pass it directly as the third argument. If you have more than one child, you can either pass them as an array for the third argument, or as additional positional arguments. You can also pass a string directly, and it will be normalized into a `RemoteText` object for you.

```ts
root.append(
  root.createComponent('BlockStack', undefined, [
    root.createComponent('Text', undefined, 'This will be fun!'),
    root.createComponent(
      'Button',
      {
        onPress() {
          console.log('Pressed!');
        },
      },
      'Press me!',
    ),
  ]),
);
```

##### `RemoteRoot#createFragment()`

`createFragment` creates a [`RemoteFragment` instance](#remotefragment). These objects can be used as props in any `RemoteComponent`. They can hold a sub tree and behave similar to `RemoteComponent`.

```ts
const iconFragment = root.createFragment();
const icon = root.createComponent('Icon');
iconFragment.append(icon);

const headerFragment = root.createFragment();
const header = root.createText('Hello world!');
headerFragment.append(header);
const card = root.createComponent('Card', {
  icon: iconFragment,
  header: headerFragment,
});
```

##### `RemoteRoot#append()`

This method appends one or more `RemoteComponent` or `RemoteText` to the remote root as the last children. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
root.append(card);
```

##### `RemoteRoot#insertBefore()`

This method inserts a `RemoteComponent` or `RemoteText` in the remote root before the specified child. This method returns a promise for when the update has been applied in the host. If the second argument is excluded, this method behaves identically to `append()`.

```ts
const card = root.createComponent('Card');
const earlierCard = root.createComponent('Card');
root.append(card);
root.insertBefore(earlierCard, card);
```

##### `RemoteRoot#removeChild()`

This method removes a `RemoteComponent` or `RemoteText` from the remote root. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
root.append(card);

// later...

root.removeChild(card);
```

##### `RemoteRoot#replaceChildren()`

This method removes all children from the root, and replaces them with the list of children passed to this method. This method returns a promise for when the update has been applied in the host.

```ts
const card = root.createComponent('Card');
root.append(card);

// later...

const newCard = root.createComponent('Card');
root.replaceChildren(newCard);
```

##### `RemoteRoot#children`

The `children` property is a readonly list of the components mounted to the tree. It does not necessarily represent the state of the host, as updates are reflected immediately to the local tree of components, but can be applied asynchronously in the host.

##### `RemoteRoot#mount()`

The `mount` method flushes the initial tree to the host. Before `mount` is called, updates are not sent to the host, which allows you to build up the entire initial tree instead of serializing each operation.

```ts
const card = root.createComponent('Card');
root.append(card);
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

##### `RemoteComponent#remove()`

Removes the component from its parent, if it is attached to one.

```ts
const card = root.createComponent('Card');
root.append(card);
card.remove();
```

##### `RemoteComponent#append()`

Just like [`RemoteRoot#append`](#remoterootappend), but appending children for a single component rather than the root.

##### `RemoteComponent#insertBefore()`

Just like [`RemoteRoot#insertBefore`](#remoterootinsertbefore), but inserting a child for a single component rather than the root.

##### `RemoteComponent#removeChild()`

Just like [`RemoteRoot#removeChild`](#remoterootremovechild), but removing a child for a single component rather than the root.

##### `RemoteComponent#replaceChildren()`

Just like [`RemoteRoot#replaceChildren`](#remoterootreplacechildren), but replacing children for a single component rather than the root.

#### `RemoteText`

A `RemoteText` object represents a text element being rendered to the host UI. It has the following properties and methods:

##### `RemoteText#text`

The current text content of the element. This representation is not mutable, so changing any value on this object will have no effect (use `update` instead)

##### `RemoteText#root`

A readonly reference to the root that constructed this component.

##### `RemoteText#parent`

A readonly reference to the parent of this component in the tree (or `null`, if it has no parent).

##### `RemoteText#update()`

Updates the text content.

```ts
const text = root.createText('Hello');

if (LOCALE === 'fr') {
  text.update('Bonjour');
}
```

##### `RemoteComponent#remove()`

Removes the text from its parent, if it is attached to one.

```ts
const text = root.createText('Hello');
root.append(card);
text.remove();
```

#### `RemoteFragment`

The `Root#createFragment` method creates a sub tree that can be used as a prop of any `RemoteComponent`. `RemoteFragment` does not any props.

##### `RemoteFragment#type`

The type of the fragment. This is a string, and must be one of the allowed components for the `RemoteRoot` that constructed the fragment.

##### `RemoteFragment#children`

A readonly array of `RemoteComponent` and `RemoteText` objects that are direct children of this fragment.

##### `RemoteFragment#root`

A readonly reference to the root that constructed this fragment.

##### `RemoteFragment#parent`

A readonly reference to the parent of this fragment in the tree (or `null`, if it has no parent).

##### `RemoteFragment#append()`

Just like [`RemoteRoot#append`](#remoterootappend), but appending a child for a single fragment rather than the root.

##### `RemoteFragment#insertBefore()`

Just like [`RemoteRoot#insertBefore`](#remoterootinsertbefore), but inserting a child for a single fragment rather than the root.

##### `RemoteFragment#removeChild()`

Just like [`RemoteRoot#removeChild`](#remoterootremovechild), but removing a child for a single fragment rather than the root.

##### `RemoteFragment#replaceChildren()`

Just like [`RemoteRoot#replaceChildren`](#remoterootreplacechildren), but replacing children for a single fragment rather than the root.

### `createRemoteReceiver()`

#### `RemoteReceiver`

The opposite side of a `RemoteRoot` is a `RemoteReceiver`. This object can accept the UI updates from the remote context and reconstruct them into an observable tree on the host. This tree can then be used to render the components to their native representation in the host (in a web application, this representation is the DOM).

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();
```

The `RemoteReceiver` instance has a number of properties and methods to connect it to a remote root, and to allow other objects to subscribe to updates. The full API is documented below.

##### `RemoteReceiver#receive()`

The `receive` method is a function that can be used as the first argument to the `createRemoteRoot` function. Passing this function to the remote root will cause all updates from that root to be reflected in the `RemoteReceiver`.

```ts
import {RemoteReceiver, createRemoteRoot} from '@remote-ui/core';

const receiver = createRemoteReceiver();
const root = createRemoteRoot(receiver.receive);
```

##### `RemoteReceiver#state`

The `state` property tells you whether the remote root has mounted or not.

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();

// logs `unmounted`
console.log(receiver.state);
```

##### `RemoteReceiver#on()`

The `on` method lets you subscribe to events on the remote root. Currently, there is only one event, `mount`, which is called when the `mount` message is received from the remote context. This method returns a function that can be called to remove the listener.

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();

receiver.on('mount', () => {
  console.log('Mounted!');
});
```

##### `RemoteReceiver#attached`

A `RemoteReceiverAttachment` object that provides access to the nodes that have been received from the remote context.

###### `RemoteReceiverAttachment#root`

The `root` property is a readonly representation of the state of the remote root. You can use this property to get the initial set of components that are children of the root.

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();

for (const child of receiver.attached.root.children) {
  console.log(child);
}
```

###### `RemoteReceiverAttachment#subscribe()`

The `subscribe` method registers a subscriber to run whenever a component in the tree changes, including the addition or removal of children, the changing of component properties, and the changing of remote text values. The first argument is the element to subscribe for, and the second is a function that will be invoked every time that element changes for any reason. This method returns a function that can be called to stop subscribing to updates.

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const {attached} = createRemoteReceiver();
const seen = new WeakMap();

attached.subscribe(attached.root, (root) => {
  console.log('Root changed!');

  for (const child of root.children) {
    if (seen.has(child)) continue;

    attached.subscribe(child, (child) => {
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

These types are used to validate the passed arguments in `RemoteRoot#createComponent`, `RemoteRoot#append`, and the other mutation APIs. With the example above, TypeScript would complain about the following calls, because we are not providing the mandatory `title` prop to `createComponent`, and we are appending a component other than `CardSection` to `Card`.

```ts
import {createRemoteRoot} from '@remote-ui/core';

const root = createRemoteRoot(/* ... */);
const button = root.createComponent(Button, {
  onPress: () => console.log('Clicked!'),
});
const card = root.createComponent(Card);
card.append(button);
```

### Other exports

This package exports a variety of helper types for easy access in more complex use cases, including some types representing the wire format remote-ui uses to communicate component tree updates. It also re-exports the [`retain` and `release` methods from `@remote-ui/rpc`](../rpc), and the [helper TypeScript types from `@remote-ui/types`](../types), for easy access.

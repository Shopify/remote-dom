# `@remote-dom/signals`

This library provides a `SignalRemoteReceiver` class, which allows you to map a remote tree of DOM elements into a collection of [`@preact/signals` `Signal` objects](https://preactjs.com/guide/v10/signals/).

## Installation

```sh
npm install @remote-dom/signals --save
pnpm install @remote-dom/signals --save
yarn add @remote-dom/signals
```

## Usage

### `SignalRemoteReceiver`

A `SignalRemoteReceiver` stores remote elements into a basic JavaScript representation, with mutable properties and children stored in signals. This representation allows for fine-grained subscriptions and computed values based on the contents of the remote tree. This custom receiver is used by the the [`@remote-dom/preact` library](https://github.com/Shopify/remote-dom/blob/main/packages/preact#remoterenderer) in order to map the remote tree to Preact components.

An empty remote receiver can be created using the `SignalRemoteReceiver` constructor:

```ts
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver();
```

To support functions being passed over `postMessage`, you may need a way to manually manage memory for remote properties as they are received. `SignalRemoteReceiver` lets you accomplish this by passing the `retain` and `release` options to the constructor, which are called when new remote properties are received and when they are overwritten, respectively:

```ts
// This library is not included with Remote DOM, but it pairs
// well with it in allowing you to pass functions between
// JavaScript environments.
import {retain, release} from '@quilted/threads';
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver({retain, release});
```

#### `SignalRemoteReceiver.connection`

Each `SignalRemoteReceiver` has a `connection` property, which can be passed to a [`RemoteMutationObserver`](/packages/core/README.md#remotemutationobserver) or [`RemoteRootElement`](/packages/core/README.md#remoterootelement) in the remote environment. This object, which the library refers to as a `RemoteConnection`, is responsible for communicating changes between the remote environment and host environments.

```ts
// In the host environment:
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver();

// In the remote environment:
import {RemoteMutationObserver} from '@remote-dom/core/elements';

const observer = new RemoteMutationObserver(receiver.connection);
```

#### `SignalRemoteReceiver.root`

Each `SignalRemoteReceiver` also has a `root` property, which defines the object that all remote element representations will be attached to. This object has a `children` property, which will be a signal containing a list of child text and element nodes, which may themselves have additional children.

```ts
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver();
const root = receiver.root;
// {
//   children: signal([]),
//   ...
// }

// You can use the signals in the root object to compute other signals,
// or use any of the standard signal APIs to interact with them:

import {effect} from '@preact/signals';

// @preact/signals will re-run this function whenever the `root.children.value`
// signal changes; this is, whenever children are added or removed from
// the root node of the remote tree.
effect(() => {
  console.log(`Receiver has ${root.children.value.length} children`);
});
```

#### `SignalRemoteReceiver.implement()`

`SignalRemoteReceiver.implement()` lets you define how [remote methods](/packages/core/README.md#remote-methods) are implemented for a particular element. The first argument to this method is the element you want to implement methods for, and the second is an object that provides the implementation for each supported method.

For example, in the example below, we implement a `alert()` method on the root element, which can then be called from the remote environment:

```ts
// In the host environment:
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver();

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

#### `SignalRemoteReceiver.get()`

`SignalRemoteReceiver.get()` fetches the latest state of a remote element that has been received from the remote environment.

```ts
import {SignalRemoteReceiver} from '@remote-dom/signals';

const receiver = new SignalRemoteReceiver();

receiver.get(receiver.root) === receiver.root; // true
```

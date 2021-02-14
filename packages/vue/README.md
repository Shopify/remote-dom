# `@remote-ui/vue`

This library provides a custom [Vue](https://v3.vuejs.org) renderer that gives you the full power of Vue for your remote application, and provides an optional host layer that makes it easy for existing Vue apps to integrate a remote root.

> **Note:** This library only supports Vue 3.x, as earlier versions of Vue did not support custom renderers.

## Installation

Using `yarn`:

```
yarn add @remote-ui/vue
```

or, using `npm`:

```
npm install @remote-ui/vue --save
```

## Usage

### Remote environment

#### `createRenderer()`

The main entrypoint for this package, `@remote-ui/vue`, provides the custom Vue renderer that outputs instructions to a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot) object. This lets you use the remote-ui system for communicating patch updates to host components over a bridge, but have Vue help manage your stateful application logic. To run a Vue app against a `RemoteRoot`, use the `createRenderer` function exported by this library to create the renderer, and use its `createApp` function to bootstrap your Vue application:

```tsx
import {h} from 'vue';

// For convenience, this library re-exports several values from @remote-ui/core, like createRemoteRoot
import {
  createRenderer,
  createRemoteRoot,
  createRemoteVueComponent,
} from '@remote-ui/vue';

// a host component — see implementation below for getting strong
// typing on the available props.
const RemoteButton = createRemoteVueComponent('Button');

// Assuming we get a function that will communicate with the host...
const channel = () => {};

const remoteRoot = createRemoteRoot(channel, {
  components: ['Button'],
});

const {createApp} = createRenderer(remoteRoot);

createApp({
  render() {
    return h(RemoteButton, {onPress: () => console.log('clicked!')}, [
      'Click me!',
    ]);
  },
}).mount(remoteRoot);
```

As you add, remove, and update host components in your Vue tree, this renderer will output those operations to the `RemoteRoot`.

#### `createRemoteVueComponent()`

In the example above, our `Button` component was created with `createRemoteVueComponent`. This function creates a Vue component that is responsible for representing the remote component. It also allows you to specify the remote component’s prop types, which become the prop types of the generated Vue component:

```tsx
import {createRemoteVueComponent} from '@remote-ui/vue';

const RemoteButton = createRemoteVueComponent<'Button', {onPress(): void}>(
  'Button',
);

// Type error, because onPress is missing!
const button = <RemoteButton>Save</RemoteButton>;
```

In Vue, components generally use events instead of function props. The `createRemoteVueComponent` allows you to offer this more native API option while preserving the flat props structure remote-ui is based on. To do so, you can pass a second argument to the `createRemoteVueComponent` function with a an `emits` mapping of event names to the prop that should trigger that event. In the example above, if we want to use a `press` event instead of an `onPress` prop, we would use the following mapping:

```tsx
import {createRemoteVueComponent} from '@remote-ui/vue';

const RemoteButton = createRemoteVueComponent<'Button', {onPress(): void}>(
  'Button',
  {
    emits: {press: 'onPress'},
  },
);
```

A Vue component can now use this component more naturally using event syntax:

```vue
<template>
  <remote-button @press="press">Click me!</remote-button>
</template>

<script lang="ts">
import {RemoteButton} from './remote-components';

export default {
  components: {RemoteButton},
  methods: {
    press() {
      console.log('Pressed!');
    },
  },
};
</script>
```

If you have a situation where you have separate packages for Vue and non-Vue components (e.g., to support the smaller bundle size of using only the core library), you can pass the result of calling `@remote-ui/core`’s `createRemoteComponent` to this version of the function, and the props will be inferred automatically.

```tsx
import {createRemoteComponent} from '@remote-ui/core';
import {createRemoteVueComponent} from '@remote-ui/vue';

const RemoteButton = createRemoteComponent<'Button', {onPress(): void}>(
  'Button',
);
const ReactRemoteButton = createRemoteVueComponent(Button, {
  emits: {press: 'onPress'},
});

// Still a type error!
const button = <RemoteButton>Save</RemoteButton>;
```

### Host environment

This package provides a second entrypoint, `@remote-ui/vue/host`, with a collection of utilities for implementing the host side of a remote-ui environment in a Vue application. These host utilities take care of receiving the patch updates from a remote context, and maps the resulting component tree to a set of Vue components you provide.

To show these utilities in action, we’ll use the same `Button` example we have looked at for the remote APIs. The host environment for those examples needs to be able to render the real `Button` component with the props received from the remote environment. To do so, we first create our host-side `Button` component (we’ll assume we are in a DOM environment, so this component will render an HTML button):

```vue
<template>
  <button type="button" @click="$emit('press')">
    <slot></slot>
  </button>
</template>

<script lang="ts">
// Vue automatically handles turning `onPress` props for this component
// into a listener for the `press` event
export default {
  name: 'Button',
  emits: ['press'],
};
</script>
```

The Vue component we will use to render our remote component tree needs to know how to map from a component name to component implementation. To do this, pass your host components to `createController()`, a function provided by this library:

```tsx
import {createController} from '@remote-ui/vue/host';

import {Button} from './Button';

const controller = createController({
  Button,
});
```

In addition to the `controller`, we need to create a [`RemoteReceiver` object](../core#remotereceiver). This object is responsible for accepting updates from the remote context, and turning them back into a tree of UI components on the host:

```tsx
import {defineComponent} from 'vue';
import {createController, createRemoteReceiver} from '@remote-ui/vue/host';

const controller = createController({
  Button,
});
const receiver = createRemoteReceiver();
const root = createRemoteRoot(receiver.receive);

const App = defineComponent({
  render() {
    // ...
  },
  mounted() {
    // You’ll usually send the receiver.receive function to the remote
    // context, and use it to construct a `@remote-ui/core` `RemoteRoot`
    // object
    sendReceiverToRemoteContext(receiver.receive);
  },
});
```

Finally, you can pass these two objects to the `RemoteRenderer` component provided by this entrypoint, which will start listening for changes to the `receiver`, and render the host React component equivalent of the remote component tree.

```tsx
import {h, defineComponent} from 'react';
import {
  createController,
  RemoteReceiver,
  RemoteRenderer,
} from '@remote-ui/vue/host';

import {Button} from './Button';

const App = defineComponent({
  render() {
    return h(RemoteRenderer, {
      receiver,
      controller,
    });
  },
  mounted() {
    // You’ll usually send the receiver.receive function to the remote
    // context, and use it to construct a `@remote-ui/core` `RemoteRoot`
    // object
    sendReceiverToRemoteContext(receiver.receive);
  },
});
```

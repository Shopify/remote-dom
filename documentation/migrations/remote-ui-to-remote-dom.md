# Migrating from `remote-ui` to Remote DOM

Remote DOM started out with as a project called `remote-ui`. The [original packages](https://www.npmjs.com/package/@remote-ui/core) had a DOM-like API, but because they did not use the DOM directly, it was difficult to use them with any JavaScript library other than React. Remote DOM is a complete rewrite of `remote-ui` that uses the DOM directly, which makes for more seamless use of browser-friendly libraries, and a simpler learning code for developers who already have familiarity with the DOM.

> **Note**: These benefits are shown in code in the [“kitchen sink” example](/examples/kitchen-sink/), where we write the same “remote” rendering code using many different techniques and JavaScript libraries.

This guide will go over how you can migrate from `remote-ui` to Remote DOM.

## Uninstall `@remote-ui` packages and install their `@remote-dom` equivalents

Almost all projects will need to swap out the `@remote-ui/core` package for `@remote-dom/core`:

```diff
{
  "dependencies": {
-    "@remote-ui/core": "^2.2.0",
+    "@remote-dom/core": "^1.0.0",
  }
}
```

If you use [`@remote-ui/react`](https://www.npmjs.com/package/@remote-ui/react), you’ll need to make some additional changes, which we’ll cover [later in this guide](#update-react-integration)

The following `@remote-ui` packages have been removed, and have no `@remote-dom` equivalent:

- [`@remote-ui/rpc`](https://www.npmjs.com/package/@remote-ui/rpc). This package was removed to simplify the repo, but you will likely still need a library that provides similar functionality, since Remote DOM depends on a smart RPC library for synchronizing event listeners and other function calls over `postMessage()`. You can continue using `@remote-ui/rpc` with `@remote-dom/core`, or you can switch to a different library that can communicate functions over `postMessage()`. [`@quilted/threads`](https://www.npmjs.com/package/@quilted/threads) is a more modern alternative that is actively maintained, or you can use another popular community library like [`comlink`](https://www.npmjs.com/package/comlink).
- [`@remote-ui/async-subscriptions`](https://www.npmjs.com/package/@remote-ui/async-subscriptions). Like `@remote-ui/rpc`, you can continue using this package with `@remote-dom/core`, or you can switch to a different library that provides similar functionality. The `@quilted/threads` package contains a more modern alternative, which allows you to [synchronize a Preact Signal over `postMessage()`](https://github.com/lemonmade/quilt/blob/main/packages/threads/README.md#preact-signals).
- [`@remote-ui/web-workers`](https://www.npmjs.com/package/@remote-ui/web-workers). You need to use a different library or build tool to create web worker sandboxes in which to run Remote DOM-powered code.
- [`@remote-ui/dom`](https://www.npmjs.com/package/@remote-ui/dom). The [`@remote-dom/core` package](/packages/core/) now provides all DOM-related utilities.
- [`@remote-ui/htm`](https://www.npmjs.com/package/@remote-ui/htm). The [`@remote-dom/core/html`](/packages/core/README.md#remote-domcorehtml) package exports an [`htm`](https://www.npmjs.com/package/htm) function for building trees of DOM nodes.
- [`@remote-ui/mini-react`](https://www.npmjs.com/package/@remote-ui/react). This library was an adapted version of [Preact](https://preactjs.com/), which is a popular alternative to React. The new DOM-based API works great with Preact, so you can use Preact directly instead. We’ve also introduced a [`@remote-dom/preact`](/packages/preact/) package that provides a few convenience utilities for using Preact with Remote DOM.
- [`@remote-ui/vue`](https://www.npmjs.com/package/@remote-ui/vue). This library was always poorly maintained. The new DOM-based API works well with Vue without any additional configuration, so we’ve removed this dedicated integration.
- [`@remote-ui/traversal`](https://www.npmjs.com/package/@remote-ui/traversal). The tree traversal utilities provided by this library are all supported natively by the DOM.
- [`@remote-ui/testing`](https://www.npmjs.com/package/@remote-ui/testing). There are many other great libraries for testing DOM code.

## Import the DOM polyfill

If you are running your Remote DOM-dependent code in a Web Worker sandbox, you will need a limited subset of the global DOM API available for Remote DOM to work. Add the following import as one of the first lines in your Web Worker code:

```ts
import '@remote-dom/core/polyfill';
```

## Define components as custom elements

In `remote-ui`, “components” were referenced by their name, by passing a string to the `RemoteRoot.createComponent()` function. In Remote DOM, components are instead [defined as custom elements](/packages/core/README.md#remote-domcoreelements). In the remote environment, you’ll need to define a custom element with the set of properties and methods that your component accepts.

```ts
// Define each component that your
class Button extends RemoteElement {
  static get remoteProperties() {
    return {
      tooltip: {type: String},
      primary: {type: Boolean},
      onPress: {event: true},
    };
  }
}

customElements.define('ui-button', Button);
```

## Update your host code to use the new `Receiver` classes

`remote-ui` provided a [`createRemoteReceiver()` utility](https://github.com/Shopify/remote-dom/tree/remote-ui/packages/core#createremotereceiver) for creating the object that will receive updates from the remote environment. In Remote DOM, this utility is replaced with the [`RemoteReceiver`](/packages/core/README.md#remotereceiver), [`DOMRemoteReceiver`](/packages/core/README.md#domremotereceiver), or [`SignalRemoteReceiver`](/packages/signals/README.md#signalremotereceiver) classes.

```ts
// Replace this:

import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();
sendToRemoteEnvironment(receiver.receive);

// With this:

import {RemoteReceiver} from '@remote-dom/core';
import {retain, release} from '@quilted/threads';

// You now need to pass in functions to manage the memory for functions manually,
// where this was previously done automatically in `@remote-ui/rpc`.
const receiver = new RemoteReceiver({retain, release});
sendToRemoteEnvironment(receiver.connection);
```

## Update your remote code to use DOM elements instead of the `RemoteRoot` object

`remote-ui` provided a [`createRemoteRoot()` utility](https://github.com/Shopify/remote-dom/tree/remote-ui/packages/core#createremoteroot) for creating the root node for a tree of remote elements. This root node managed the top-level children of the tree, and had methods for creating components to be inserted into the tree. In Remote DOM, this API is removed in favor of native DOM APIs.

```ts
// Replace this:

import {createRemoteRoot} from '@remote-ui/core';

export function receiveChannelFromHostEnvironment(channel) {
  const root = createRemoteRoot(channel);
  const button = root.createComponent(
    'Button',
    {
      primary: true,
      onPress: () => console.log('Pressed!'),
    },
    ['Press me!'],
  );
  root.appendChild(button);
}

// With this:

import {RemoteRootElement} from '@remote-dom/core/elements';

// Define our `Button` custom element, from earlier.
customElements.define('ui-button', Button);

// If you’re using an `<iframe>` sandbox, you should use the `RemoteMutationObserver`
// and an empty `div` element instead.
customElements.define('remote-root', RemoteRootElement);

export function receiveConnectionFromHostEnvironment(connection) {
  const root = document.createElement('remote-root');
  document.body.appendChild(root);

  const button = document.createElement('ui-button');
  button.primary = true;
  button.addEventListener('press', () => console.log('Pressed!'));
  button.textContent = 'Press me!';
  root.appendChild(button);
}
```

The new approach feels right at home in a DOM-focused project, but you should be mindful of the following differences from the `RemoteRoot` object from `remote-ui`:

- You can’t restrict which element types are allowed as children of a DOM element acting as the remote root. We recommend applying this restriction on the host environment instead.
- Because there is no `root.createComponent()` function, you can’t prevent elements from being moved between remote roots.

## Replace `RemoteFragment` objects with `slot` attributes

In `remote-ui`, you could pass a `RemoteFragment` object as a property of a component. This concept has been removed in Remote DOM, because there is no equivalent concept in HTML. Instead, we expect you to use the [`slot` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot) to tag child elements with a name.

```ts
// Replace this:

const root = createRemoteRoot(/* ... */);
const fragment = root.createFragment();
const icon = root.createComponent('Icon', {type: 'archive'});
fragment.append(icon);
const button = root.createComponent('Button', {icon: fragment}, ['Archive']);
root.append(button);

// With this:

const root = document.createElement('remote-root');
const button = document.createElement('ui-button');
button.textContent = 'Archive';
const icon = document.createElement('ui-icon');
icon.setAttribute('type', 'archive');
icon.setAttribute('slot', 'icon');
button.append(icon);
root.append(button);
```

## Update React integration

The [`@remote-ui/react`](https://www.npmjs.com/package/@remote-ui/react) package provided a set of utilities for both the host and remote environments of a `remote-ui` project. On the host, this library provides utilities for rendering a tree of remote nodes into React components. In the remote environment, it provides a custom React reconciler that resolves a tree of React components into the necessary method calls on a `RemoteRoot` object. The [`@remote-dom/react` package](/packages/react/) provides the same set of utilities, but with a few changes to the API.

### Uninstall `@remote-ui/react` and install `@remote-dom/react`

Like with `@remote-ui/core`, you’ll need to swap out the `@remote-ui/react` package for its `@remote-dom` equivalent:

```diff
{
  "dependencies": {
-    "@remote-ui/react": "^5.0.0",
+    "@remote-dom/react": "^1.0.0",
  }
}
```

`@remote-dom/react` no longer provides a custom reconciler for React, because you can now use `react-dom` directly. So, make sure you have `react-dom` installed. If you had `react-reconciler` installed for `@remote-ui/react`, you can also remove this dependency.

```diff
{
  "dependencies": {
    "@remote-dom/react": "^1.0.0",
    "react": "^18.2.0",
+    "react-dom": "^18.2.0",
-    "react-reconciler": "*",
  }
}
```

Note that, with the new focus on DOM compatibility, we’ve added a new [`@remote-dom/preact` library](/packages/preact/). This library provides all the same APIs and developer conveniences as the React package, but for Preact, a lightweight alternative to React. Particularly in the remote environment, you should consider offering a Preact option, as it produces smaller bundles that are well-suited to being run in a sandboxed JavaScript environment.

### Update the React render call in the remote environment

The custom reconciler provided by `@remote-ui/react` had custom `render()` and `createRoot()` functions that you’d use to kick off a React render to a `RemoteRoot`. You can change this to instead use the `react-dom` package to render directly to a DOM element.

```tsx
// Replace this:

import {createRemoteRoot} from '@remote-ui/core';
import {createRoot} from '@remote-ui/react';

const root = createRemoteRoot(/* ... */);
createRoot(remoteRoot).render(<App />);

// With this:

import {createRoot} from 'react-dom/client';

const root = document.createElement('remote-root');
createRoot(root).render(<App />);
```

### Update the React wrapper components in the remote environment

The `@remote-ui/react` package also provided a `createRemoteReactComponent()`, which creates strongly-typed React components that render a remote component of your choosing. This function is replaced by the [`createRemoteComponent()` function](/packages/react/README.md#createremotecomponent) in `@remote-dom/react`, which gets strong typing from the `HTMLElement` subclass you define to represent your component:

```tsx
// Replace this:

import {createRemoteReactComponent} from '@remote-ui/react';

const Button = createRemoteReactComponent<'Button', {onPress(): void}>(
  'Button',
);

// With this:

import {createRemoteComponent} from '@remote-dom/react';

// Define our custom `Button` element, as shown above.
customElements.define('ui-button', Button);

const ReactButton = createRemoteComponent('ui-button', Button);
```

### Update the host environment that renders remote elements to React components

The `@remote-ui/react/host` package provided some components and utility functions for rendering a remote root to React components. `@remote-dom/react/host` provides similar utilities, but with a few tweaks. In particular, you will now need to wrap all elements in a [`createRemoteComponentRenderer()` call](/packages/react/README.md#createremotecomponentrenderer), which subscribes your host React components to render in response to remote element changes.

```tsx
// Replace this:

import {useMemo, useEffect} from 'react';
import {
  createController,
  createRemoteReceiver,
  RemoteRenderer,
} from '@remote-ui/react/host';

import {Button} from './Button';

function MyRemoteRenderer() {
  const controller = useMemo(() => createController({Button}), []);
  const receiver = useMemo(() => createRemoteReceiver(), []);

  useEffect(() => {
    sendReceiverToRemoteContext(receiver.receive);
  }, [receiver]);

  return <RemoteRenderer receiver={receiver} controller={controller} />;
}

// With this:

import {useMemo, useEffect} from 'react';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  RemoteReceiver,
} from '@remote-dom/react/host';

import {Button} from './Button';

function MyRemoteRenderer() {
  const components = useMemo(
    () =>
      new Map([
        ['ui-button', createRemoteComponentRenderer(Button)],
        // If you want to allow React elements to be passed as props in the remote
        // environment, `@remote-dom/react` will render a `remote-fragment` element
        // in some cases. You need to provide a renderer for this element.
        ['remote-fragment', RemoteFragmentRenderer],
      ]),
    [],
  );
  const receiver = useMemo(() => new RemoteReceiver(), []);

  useEffect(() => {
    sendReceiverToRemoteContext(receiver.connection);
  }, [receiver]);

  return <RemoteRootRenderer receiver={receiver} components={components} />;
}
```

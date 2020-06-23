# remote-ui

remote-ui allows you to create custom component APIs in JavaScript that can be used to render UI from a context other than the UI thread, like a web worker. This technique can be a powerful performance optimization by isolating application code on a background thread, leaving only the platform-native components on the UI thread. It can also be used as a way for third party code to generate UI in a safe, dynamic, and highly-performant way, without relying on iframes.

## Navigating remote-ui

remote-ui is a collection of projects that work together to provide the capability of remotely rendering UI:

- [`@remote-ui/core`](packages/core) gives you the tools to create a “remote root”: a root for a tree of component nodes that can communicate operations (adding or removing children, changing properties of components) through a tiny wire format suitable for `postMessage` communication. This remote root can enforce validations, like restricting the available components, their children, and their allowed properties. Finally, this library offers some helpful utilities for implementing “hosts” of a remote root; that is, code running on the UI thread that can transform the communication format of a remote root into platform-native components.
- [`@remote-ui/rpc`](packages/rpc) is a small wrapper for `postMessage`-like interfaces. Its key feature is flexible support for serializing functions (implemented via message passing), with additional helper functions to help with the memory management concerns of serializing functions. While not strictly necessary, passing functions as component properties (e.g., `onPress` of a `Button` component) is often very useful, and so all libraries in this project assume the use of this `rpc` library in order to provide seamless handling of function component properties.
- [`@remote-ui/web-workers`](packages/web-workers) makes it easy to use remote-ui to offload application code to a web worker. It does so through small runtime utilities and a collection of build tool integrations that allow you to author web workers with all the comfort of your existing tools and libraries.

The main API of remote-ui, provided by [`@remote-ui/core`](packages/core), is small, and similar to the DOM. This makes it well-suited as a target for other libraries, which can provide different tradeoffs of performance and developer ergonomics for code executing in the remote environment. The “host” side is also meant to be flexible, allowing you to map the simple “tree of components” structure from the remote environment into many different UI libraries on the main thread. This repo provides bindings to the host and/ or remote parts of remote-ui for a few popular libraries:

> **Legend:**
>
> Host 🌎: provides a host layer that can map remote-ui components to UI components
>
> Remote 🛰️: provides a way to manage the tree of remote-ui components in the remote context

| Library                              | Host 🌎 | Remote 🛰️ |
| ------------------------------------ | ------- | --------- |
| [`@remote-ui/react`](packages/react) | ✅      | ✅        |
| [`@remote-ui/dom`](packages/dom)     | ✅      | ❌        |
| [`@remote-ui/htm`](packages/htm)     | ❌      | ✅        |

Finally, this repo also contains a number of utility libraries for working with remote-ui:

- [`@remote-ui/testing`](packages/testing) provides a test-friendly `RemoteRoot` object, and a collection of helpful Jest assertions.
- [`@remote-ui/traversal`](packages/traversal) provides DOM-like APIs for finding components in a `RemoteRoot`.
- [`@remote-ui/async-subscription`](packages/async-subscription) helps you build subscriptions that work when all functions must be asynchronous, like they are when passed over the bridge created by [`@remote-ui/rpc`](packages/rpc).

## Examples

We have created an example project, bootstrapped with [Create React App](https://github.com/facebook/create-react-app), that shows how you can incorporate the different parts of remote-ui into a simple React codebase.

Want to learn even more? [Read through the comprehensive example](documentation/comprehensive-example.md), a written guide that documents a fully-featured implementation of remote-ui across both the host (browser) and remote (web worker) environments.

## Want to contribute?

Check out our [contributing guide](CONTRIBUTING.md).

## License

MIT &copy; [Shopify](https://shopify.com/), see [LICENSE.md](LICENSE.md) for details.

<a href="http://www.shopify.com/"><img src="https://cdn.shopify.com/assets2/brand-assets/shopify-logo-main-8ee1e0052baf87fd9698ceff7cbc01cc36a89170212ad227db3ff2706e89fd04.svg" alt="Shopify" width="200" /></a>

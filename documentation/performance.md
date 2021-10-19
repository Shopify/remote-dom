# Performance

This document goes over some of the considerations you should make if you are trying to adopt remote-ui. It also goes over how some of these performance concerns guide the design of remote-ui’s APIs.

## Bundle size

At its core, remote-ui is about being able to spin up a remote JavaScript environment that can be used to control UI components. This model has some important benefits; most notably, many remote environments (like [web workers](../packages/web-workers)) run the remote code off the main thread, preventing one source of user interface “jank”. However, there is also a major downside to this model: the new JavaScript environment needs to be spun up, and the code (including any environment polyfills) needs to be downloaded and executed. If your use of remote-ui involves spinning up many remote contexts, this initial overhead is particularly important.

remote-ui is designed to have a very small footprint in order to minimize its bundle size impact. The only mandatory parts for a remote-ui system are the [remote procedure call (RPC) utilities from `@remote-ui/rpc`](../packages/rpc), and the [root, component, and text APIs from `@remote-ui/core`](../packages/core). These two packages together are [~6kb gzipped](https://bundlephobia.com/result?p=@remote-ui/core), and can be 3–4kb if you configure your build tools to [continually transpile and polyfill](./guides/polyfills.md).

The `@remote-ui/core` API is a particularly good example of how remote-ui is designed for small size. The `RemoteRoot` and `RemoteComponent` APIs from that library offer enough to maintain a tree of remote components, but nothing more. There are no traversal APIs — instead, those features are provided by [tree-shakeable](https://webpack.js.org/guides/tree-shaking/) functions in [`@remote-ui/traversal`](../packages/traversal). Similarly, all convenience methods for creating many remote components quickly are provided by optional packages like [`@remote-ui/htm`](../packages/htm), which sit on top of the minimal APIs offered by `@remote-ui/core`.

### Custom renderers

remote-ui’s core APIs are a good target for UI libraries that can manipulate DOM-like APIs, such as [React](https://reactjs.org/). We provide a custom reconciler to render React applications to remote-ui in [`@remote-ui/react`](../packages/react). However, it’s important to note that these custom renderers are not “free” — even if you use React in both the host and remote applications, the entire renderer is downloaded and executed in **both** separately. In the case of the the React renderer, this can be anywhere from [15–20kb of code](https://bundlephobia.com/result?p=@remote-ui/react) loaded in the remote context before it can render anything.

This doesn’t mean you shouldn’t use these custom renderers — they can be very useful for highly stateful applications in the remote context, as they are when used directly in the browser. However, if you are using remote-ui, you are either interested in the performance benefits of running application code off the main thread, or you are working on a very large application that has smaller applications embedded into it. In either case, you should understand the performance and bandwidth costs of using these larger abstractions widely, and try to restrict their use to where they provide the most user value.

## Component APIs

remote-ui provides a very simple component model; the main focus is the [`RemoteComponent`](../packages/core#remotecomponent), which have just a `type`, `props` (properties), and `children`. This model was heavily inspired by React and the DOM, and so good “component design” (what types exist, what properties exist on each type, and what it does with children) is generally pretty similar in remote-ui.

However, remote-ui has one important feature that can impact some component APIs: components can’t have synchronous function properties. As noted in the [`@remote-ui/rpc` documentation](../packages/rpc), in order to make function passing between the remote and host contexts work, all functions become asynchronous (implemented via message passing).

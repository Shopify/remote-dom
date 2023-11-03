# `@remote-ui/rpc`

This library provides a powerful remote procedure call (RPC) abstraction for the rest of the remote-ui libraries. The key feature of this RPC layer is the ability for functions to be passed across a `postMessage` interface, which makes sending messages between `postMessage`-compatible objects more ergonomic, and supports the common need for passing event callbacks as remote component properties.

## Installation

Using `yarn`:

```
yarn add @remote-ui/rpc
```

or, using `npm`:

```
npm install @remote-ui/rpc --save
```

## Prerequisites

`@remote-ui/core` uses JavaScript’s native `Map`, `Set`, `WeakSet`. It also uses numerous language constructs that require the `Symbol` global. This package also makes heavy use of Promises and async/ await, which are based on generators.

Polyfills for all of these features (via [`core-js`](https://github.com/zloirock/core-js) and [regenerator-runtime](https://github.com/facebook/regenerator/tree/master/packages/regenerator-runtime)) are imported automatically with the “default” version of this package. If you have a build system that is smart about adding polyfills, you can configure it to [prefer (and process) a special build meant to minimize polyfills](/documentation/guides/polyfills.md).

## Usage

Most developers will not need to know about `@remote-ui/rpc`. The [comprehensive example](/documentation/comprehensive-example.md) shows how a developer can use the higher-level abstractions available in `@remote-ui/core` and `@remote-ui/web-workers` to build a powerful, remote-ui-powered UI. However, users with more complex needs may need to use this library directly, such as those constructing remote environments around an object other than a web worker.

### `createEndpoint()`

The main export this library provides is `createEndpoint`, which creates an `Endpoint` object. An `Endpoint` wraps a `postMessage` interface, managing all messages sent and received. The example below shows how an `Endpoint` seamlessly wraps a `Worker` object in the browser:

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker);
```

This `Endpoint` object expects to have a “sibling” on the other side of the `postMessage` interface. In the case of a web worker, we would construct the sibling inside our `worker.js` file like so (assuming a build process compiled the following into browser-friendly JavaScript):

```ts
import {createEndpoint} from '@remote-ui/rpc';

const endpoint = createEndpoint(self);
```

Right now, these endpoints have nothing to “talk about”. An `Endpoint` needs to `expose` methods to its sibling. For example, we can expose a function in our worker file that will return a message to the main thread:

```ts
import {createEndpoint} from '@remote-ui/rpc';

const endpoint = createEndpoint(self);

endpoint.expose({sayHello});

function sayHello() {
  return 'Hey :)';
}
```

Finally, our original `Endpoint` can `call` its sibling’s new method:

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker);

endpoint.call.sayHello().then((result) => console.log(`They said: ${result}`));
```

This seemingly-magic `call` property is a [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) that will forward all method calls via message passing to the sibling `Endpoint`. If you are in an environment without `Proxy`, you **must** supply the `callable` option when constructing your endpoint, and you must list all methods you will ever call on the sibling `Endpoint`:

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker, {
  callable: ['sayHello'],
});

endpoint.call.sayHello().then((result) => console.log(`They said: ${result}`));
```

You’ll notice that the `sayHello()` method returns a `Promise` when invoked in this way, even though the original function in the worker was synchronous. This is a key thing to understand about this library: since it implements these “function calls” via `postMessage`, **all functions passing between the `Endpoints` become asynchronous**.

The example above illustrates a very simple function that accepted no arguments. The real power of `@remote-ui/rpc` is that it allows you to pass arguments to these functions, including arguments that themselves contain functions the other side of the `Endpoint` will need to call:

```ts
// in `worker.ts`:

import {createEndpoint} from '@remote-ui/rpc';

const endpoint = createEndpoint(self);

endpoint.expose({sayHello});

interface User {
  fullName(): string | Promise<string>;
}

async function sayHello(user: User) {
  return `Hey, ${await user.fullName()}!`;
}

// back on the main thread:

import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker);

const user = {
  fullName() {
    return 'Shoppy the bag';
  },
};

// Eventually prints `They said: Hey, Shoppy the bag!
endpoint.call
  .sayHello(user)
  .then((result) => console.log(`They said: ${result}`));
```

Notice that, like the `sayHello` function itself, the `fullName` function on the `user` object is automatically implemented using message passing, and becomes asynchronous as a result, even though its original implementation was synchronous.

If you are deeply familiar with RPC libraries, you may be concerned about memory for these functions being leaked. `@remote-ui/rpc` is smart enough to clean up the memory for proxied functions in an example like the one above automatically, but complex uses can necessitate additional, manual memory management. This is discussed in the documentation for [`retain()`](#retain) and [`release()`](#release).

### `Endpoint`

An `Endpoint` object has a collection of methods and properties for progressively mutating the way it will respond to, or communicate with, its sibling.

#### `Endpoint#call`

This property exposes all the methods available on the `Endpoint`’s sibling. By default, this property will be a proxy that passes all methods across, and throws asynchronously if the method is not defined on the sibling. If your environment does not support proxies, or you want only designated methods to be callable, you can pass the `callable` option when constructing the endpoint, or add additional callable methods with [`Endpoint#callable()`](#endpointcallable).

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker, {
  callable: ['sayHello'],
});

endpoint.call.sayHello().then(console.log);
```

If you are using TypeScript, you can supply a type parameter to `createEndpoint` for an interface with the methods the sibling will expose. `call` will then be strongly typed to ensure you pass the correct arguments.

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');

interface WorkerApi {
  sayHello(name: string): string;
}

const endpoint = createEndpoint<WorkerApi>(worker, {
  // will ensure you only provide valid method names
  callable: ['sayHello'],
});

// Type error: sayGoodbye is not defined!
endpoint.call.sayGoodbye().then(console.log);

// Type error: sayHello expects a `string` argument!
endpoint.call.sayHello().then(console.log);
```

#### `Endpoint#expose()`

This is effectively the opposite end of a sibling’s `call` property. This method accepts an object with the methods that will be run when the sibling runs `call.propertyName()`. These methods can only accept the [“simple types” the RPC library supports](#function-arguments). Additionally, any functions they accept, either directly or nested in objects/ arrays, must be considered to at least sometimes return promises (as they always will when the function came from a different `Endpoint`).

```ts
import {createEndpoint, SafeRpcArgument} from '@remote-ui/rpc';

const endpoint = createEndpoint(self);

endpoint.expose({sayHello});

interface User {
  fullName(): string;
}

// When using TypeScript, we can use the helper `SafeRpcArgument` type,
// which will ensure any methods, even ones deeply nested, include a function
// return type.
async function sayHello(user: SafeRpcArgument<User>) {
  return `Hey, ${await user.fullName()}!`;
}
```

#### `Endpoint#callable()`

`Endpoint`s can incrementally expose additional methods using `expose()`. However, `Endpoint`s created with a `callable` argument are “locked” to the original set of methods. The `callable` method exposes additional callable properties on `Endpoint#call` for each string you pass.

```ts
import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker, {
  callable: [],
});

endpoint.callable('sayGoodbye');

endpoint.call.sayGoodbye().then(console.log);
```

#### `Endpoint#terminate()`

The `terminate` method on an `Endpoint` will clear out all internal storage of the endpoint, and call `terminate` on the `postMessage` interface, if it exists.

#### `Endpoint#replace()`

The `replace` method on an `Endpoint` will replace the `postMessage` interface being used. When called, the `Endpoint` will stop listening for messages on the original, and will send all subsequent messages to the new `postMessage` instead. You should only use this feature if you really know what you’re doing™.

### Memory management

Implementing functions using message passing always leaks memory. The implementation in this library involves storing a unique identifier for each function sent between sibling `Endpoint`s; when this identifier is received by the sibling, it recognizes it as a “function identifier”. It then maps this function to its existing representation for that ID (if it has been sent before), or creates a new function for it. This function, when called, will send a message to the original source of the function, listing the ID of the function to call (alongside the arguments and other metadata). However, because the two environments need to be able to reference the function and its proxy by ID, it can never release either safely.

`@remote-ui/rpc` implements some smart defaults that make memory management a little easier. By default, a function is only retained for the lifetime of its “parent” — the function call that caused the function to be passed. Let’s look at an example of an `Endpoint` that accepts a function (here, as the `user.fullName` method):

```ts
// in `worker.ts`:

import {createEndpoint} from '@remote-ui/rpc';

const endpoint = createEndpoint(self);

endpoint.expose({sayHello});

interface User {
  fullName(): string | Promise<string>;
}

async function sayHello(user: User) {
  return `Hey, ${await user.fullName()}!`;
}
```

The sibling would call this method like so:

```ts
// back on the main thread:

import {createEndpoint} from '@remote-ui/rpc';

const worker = new Worker('worker.js');
const endpoint = createEndpoint(worker);

const user = {
  fullName() {
    return 'Shoppy the bag';
  },
};

endpoint.call.sayHello(user).then(console.log);
```

A naive implementation would retain the `user.fullName` function forever, even after the `sayHello()` call was long gone, and even if `user` would otherwise have been garbage collected. However, with `@remote-ui/rpc`, this function is automatically released after `sayHello` is done. It does so by marking the function as used (“retained”) when `sayHello` starts, then marking it as unused when `sayHello` is finished. When a function is marked as completely unused, it automatically cleans up after itself by removing the memory in the receiving `Endpoint`, and sending a message to its source `Endpoint` to release that memory, too.

```ts
async function sayHello(user: User) {
  // user.fullName is retained automatically here
  return `Hey, ${await user.fullName()}!`;
  // just before we finish up and send the message with the result,
  // we release user, which also releases user.fullName
}
```

This automatic behavior is problematic if you want to hold on to a function received via `@remote-ui/rpc` and call it later, after the function that received it has finished. To address this need, this library provides two functions for manual memory management: `retain` and `release`.

#### `retain()`

As noted above, you will `retain()` a value when you want to prevent its automatic release. Calling `retain` will, by default, deeply retain the value — that is, it will traverse into nested array elements and object properties, and retain every `retain`-able thing it finds. You will typically use this alongside also storing that value in a variable that lives outside the context of the function.

```ts
import {retain} from '@remote-ui/rpc';

const allUsers = new Set<User>();

async function sayHello(user: User) {
  allUsers.add(user);
  retain(user);
  return `Hey, ${await user.fullName()}!`;
}
```

Once you have explicitly `retain`ed a value, it will never be released until the `Endpoint` is terminated, or a matching number of `release()` calls are performed on the object.

#### `release()`

Once you are no longer using the a `retain`-ed value, you must `release` it. Like `retain()`, this function will apply to all nested array elements and object properties.

```ts
import {release} from '@remote-ui/rpc';

const allUsers = new Set<User>();

function removeUser(user: User) {
  allUsers.delete(user);
  release(user);
}
```

Once an object is fully released, any attempt to call its proxied functions will result in an error.

## Function arguments

Not all types of arguments are supported for functions proxied over `postMessage` by `@remote-ui/rpc`. Only the following simple types can be used:

- Strings, numbers, `true`, `false`, `null`, and `undefined`
- Objects whose keys and values are all simple types
- Arrays whose values are all simple types
- Functions, but they will become asynchronous when proxied, and all functions accepted by arguments in those functions, or returned as part of return values, will have the same argument limitations

This excludes many types, but of particular note are the following restrictions:

- No `Map`, `Set`, `WeakMap`, or `WeakSet`
- No `ArrayBuffer` or typed arrays
- No `URL` or `RegExp`
- Instances of classes will transfer, but only their own properties — that is, properties on their prototype chain **will not** be transferred (additionally, no effort is made to preserve `instanceof` or similar checks on the transferred value)

## Adaptors

This library also provides a collection of adaptors that transform common `postMessage`-related objects into an `Endpoint`. You can of course write your own adaptor for these (and may need to, if you have complex needs), but these adaptors can be a helpful starting point:

- `fromWebWorker()` allows you to create an `Endpoint` from a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers):

  ```ts
  import {createEndpoint, fromWebWorker} from '@remote-ui/rpc';

  const worker = new Worker('./worker.js', import.meta.url);
  const endpoint = createEndpoint(fromWebWorker(worker));
  ```

- `fromMessagePort()` allows you to create an `Endpoint` from a [`MessagePort` object](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort)

  ```ts
  import {createEndpoint, fromMessagePort} from '@remote-ui/rpc';

  const channel = new MessageChannel();
  const endpoint = createEndpoint(fromMessagePort(channel.port2));
  ```

- `fromIframe()` allows you to create an `Endpoint` from a browser window by connecting it to a child `iframe`:

  ```ts
  import {createEndpoint, fromIframe} from '@remote-ui/rpc';

  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', '/my-iframe-page');
  document.append(iframe);

  const endpoint = createEndpoint(fromIframe(iframe));

  // Optionally, you can pass {terminate: false} to prevent the iframe from being
  // removed from the DOM when the endpoint is terminated:
  const endpoint2 = createEndpoint(fromIframe(iframe, {terminate: false}));
  ```

- `fromInsideIframe()` allows you to create an `Endpoint` from a parent browser window, from _within_ a child `iframe`:

  ```ts
  // Can only be run from inside an iframe, where `self.parent` is available
  import {createEndpoint, fromInsideIframe} from '@remote-ui/rpc';

  const endpoint = createEndpoint(fromInsideIframe());
  ```

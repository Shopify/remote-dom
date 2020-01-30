# Remote UI

> **Note**: this project is still an experiment. Proceed only if you’re ready for things to be a little unfinished.

Remote UI allows you to create custom component APIs in JavaScript that can be used to render UI from a context other than the UI thread, like a web worker. This technique can be a powerful performance optimization by isolating application code on a background thread, leaving only the platform-native components on the UI thread. It can also be used as a way for third party code to generate UI in a safe, dynamic, and highly-performant way, without relying on iframes.

Remote UI is made up of a few different modules that allow development teams to expose these “UI APIs” in a way that makes sense for them:

- `@remote-ui/core` gives you the tools to create a “remote root”: a root for a tree of component nodes that can communicate operations (adding or removing children, changing properties of components) through a tiny wire format suitable for `postMessage` communication. This remote root can enforce validations, like restricting the available components, their children, and their allowed properties. Finally, this library offers some helpful utilities for implementing “hosts” of a remote root; that is, code running on the UI thread that can transform the communication format of a remote root into platform-native components.
- `@remote-ui/rpc` is a small wrapper for `postMessage`-like interfaces. Its key feature is flexible support for serializing functions (implemented via message passing), with additional helper functions to help with the memory management concerns of serializing functions. While not strictly necessary, passing functions as component properties (e.g., `onPress` of a `Button` component) is often very useful, and so all libraries in this project assume the use of this `rpc` library in order to provide seamless handling of function component properties.
- `@remote-ui/web-worker` makes it easy to use Remote UI to offload application code to a web worker. It does so through small runtime utilities and a collection of build tool integrations that allow you to author web workers with all the comfort of your existing tools and libraries.
- `@remote-ui/react` adds some friendly React bindings on top of `@remote-ui/core`. It provides a custom React renderer that lets you use all the React features you’re used to from React DOM or React Native, but which outputs updates as operations on the core library’s component types. It also provides a React component that handles the UI thread by mapping custom components from the remote root to React components on the host.

The rest of this document will show a complete, end-to-end working example that uses Remote UI in a web application, but deeper explanation of the available APIs and options is left to the individual library's documentation.

## Example

> Note: this is not the simplest example of using the library. This example is presented to show you all of the different moving pieces of Remote UI, leading up to an explanation of how it works under the hood.

Integrating Remote UI into your application requires some planning, in order to determine the UI components that should be available for the remote context to render, and will require some way of packaging up code to run in that remote context. In this example, we will consider a [React](https://reactjs.org) application that uses [Webpack](https://webpack.js.org) to build its application code. The goal of this work is to expose a small, highly-controlled sandbox that will load third-party JavaScript and, when asked for by the application, will run that JavaScript to render dynamic UI. We want that third-party JavaScript to have the option to use React for their UI, because React offers an elegant state and component model that makes it easy to build features with complex business logic.

As you implement this feature, it's important to understand the two environments code will be executing in. The first is the "host" environment: this is the code that runs directly in the browser, like the rest of your current React application. This code has full access to the DOM, but in exchange, this code sits on the main thread and can block user interactivity. Minimizing the amount of code that runs in this environment is the main feature of Remote UI.

The second environment is the "remote" one. A remote environment in Remote UI can be anything that can execute JavaScript, and that can communicate via message passing. In the case of web applications, the best remote environment for running code that will output UI is a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). Web workers run in the browser (so latency is at a minimum), have the same JavaScript features as their parent page, are a fully isolated runtime environment, have minimal creation overhead, and, most importantly, run on a separate thread. Our example application will therefore use a worker to run the third-party code.

Assuming you already have a React app running, you already have a host environment, but you do not have any way of creating the remote environment.

The [`@remote-ui/web-workers` package](TODO) provides some helpful tooling integrations that make it seamless to create web workers that work great with the rest of the `@remote-ui` libraries. In our case, we will use the [Babel](https://babeljs.io) and Webpack integrations to automatically produce files suitable for web workers on boundaries we create using the `createWorkerFactory` function, also provided by this library.

First, we’ll update our Webpack configuration to include the build tools:

```ts
// wherever you configure your webpacks :)

import {WebWorkerPlugin} from '@remote-ui/web-workers/webpack';

module.exports = {
  // other config...
  plugins: [
    // any other plugins...
    new WebWorkerPlugin(),
  ],
  module: {
    rules: [
      // other rules...
      // This is the rule for our application JavaScript/ TypeScript
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: [
          // However you configure Babel, just make sure to include the plugin.
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              plugins: [require.resolve('@remote-ui/web-workers/babel')],
            },
          },
        ],
      },
    ],
  },
};
```

This configuration will make it so that, whenever we use the `createWorkerFactory` function, it will split up the application and compile the code referenced by `createWorkerFactory` to run in a web worker. We’ll do that now inside a new React component that will host the worker:

```tsx
// in WorkerRenderer.tsx

import React from 'react';
import {createWorkerFactory} from '@remote-ui/web-workers';

const createWorker = createWorkerFactory(() => import('./worker'));

export function WorkerRenderer() {
  return null;
}
```

For now, we have left our component implementation empty — we’ll come back to it later. We're also referencing a `worker` file that is a sibling to this component, so go ahead and create a blank `worker.ts` file now. This file will be the entry point for our remote environment.

```ts
// worker.ts
```

We now have a remote environment, but we need to plan exactly how this remote environment will work in order to load the third-party JavaScript and signal to the parent page what UI to render. We can do this in the following sequence:

1. Add a global API that the third-party code can call to register a callback to run when we need to render some UI. We unfortunately need to rely on the global environment to share anything with the third-party code, because that code is not controlled by us at all. We will do this by providing a `onRender` global that will register a function to run on render. This function will accept a `RemoteRoot` object, which we will construct, as that is the interface this library provides for remote environments to interact with the UI components.

   ```ts
   // in worker.ts

   import {RemoteRoot} from '@remote-ui/core';

   type RenderCallback = (root: RemoteRoot) => void;

   let renderCallback: RenderCallback | undefined;

   // `self` is a reference to the global object here
   self.onRender = (callback: RenderCallback) => {
     renderCallback = callback;
   };
   ```

   Note how we can continue to use our typical developer tools, like TypeScript, modules, and more. Webpack will compile this code just like it does for the rest of your application, so this will continue to work just fine at runtime.

2. Expose a function from your worker that the host page can call with the information needed to render: the third-party code to execute, and the receiving end of the remote root. One of the great features of `@remote-ui/web-workers` is that it automatically turns any exports from the entrypoint of a worker into runnable methods when you instantiate the worker.

   ```ts
   // in worker.ts

   import {createRemoteRoot, RemoteRoot, RemoteReceiver} from '@remote-ui/core';

   type RenderCallback = (root: RemoteRoot) => void;

   let renderCallback: RenderCallback | undefined;

   // `self` is a reference to the global object here
   self.onRender = (callback: RenderCallback) => {
     renderCallback = callback;
   };

   export function run(script: string, receiver: RemoteReceiver) {}
   ```

3. We now have all the parts required to run the third-party code and, after it has had a chance to register its render callback, start the rendering:

   ```ts
   // in worker.ts, focusing on the run() export

   export function run(script: string, receiver: RemoteReceiver) {
     // This is a global available in workers that will synchronously download
     // and execute the referenced script.
     importScripts(script);

     if (renderCallback != null) {
       const remoteRoot = createRemoteRoot();
       renderCallback(remoteRoot);
     }
   }
   ```

   The code above works, but we haven’t defined any components that can be rendered. By default, a remote root only allows you to render host components you explicitly list as available. You can list available components in different ways depending on the strictness and dynamism you need from the environment. For now, we will provide a list of available types manually to `createRemoteRoot`:

   ```ts
   import {retain} from '@remote-ui/core';

   export function run(script: string, receiver: RemoteReceiver) {
     // Functions you get from the UI thread that you want to "keep alive"
     // outside the scope of the function in which they were received need
     // to be manually retained. See @remote-ui/rpc documentation for details.

     retain(receiver);

     importScripts(script);

     if (renderCallback != null) {
       const remoteRoot = createRemoteRoot({
         components: ['Card', 'Button'],
       });
       renderCallback(remoteRoot);
     }
   }
   ```

Our remote environment is now fully constructed and can load third-party code. That code will use the API available from the remote root instance we created to write their UI:

```ts
// in the third-party code...

self.onRender((root) => {
  const card = root.createComponent('Card');
  const cardText = root.createText('Card contents');
  card.appendChild(cardText);

  const button = root.createComponent('Button', {
    onPress() {
      console.log('Pressed!');
    },
  });
  const buttonText = root.createText('Click me');
  button.appendChild(buttonText);

  card.appendChild(button);
  root.appendChild(card);
  root.mount();
});
```

We‘ll come back to this example a little later, but for now, the third party at least has a safe, DOM-like abstraction for interacting with the UI from the remote environment. Or at least, they will, once we have finished our host-side implementation to actually map what a `Card` and `Button` from the worker will map to when rendered on the host. Let’s do that part next.

The `@remote-ui/react` library has a couple of utilities we can use to implement the host of our application. We’ll need two things: a receiver, that will take updates to the UI from the remote environment and save them in a way that the host can use them, and a component that can take the current state of the remote root and map it to native components. These map to the `RemoteReceiver` and `RemoteRenderer` exports from `@remote-ui/react/host`, respectively. We’ll also need a helpful React hook to instantiate the worker alongside the React component (and terminate it when the component unmounts), which we’ll get from the `@remote-ui/web-workers/react` library.

```tsx
// back in WorkerRenderer.tsx

import React, {useMemo, useEffect, ReactNode} from 'react';
import {createWorkerFactory, useWorker} from '@remote-ui/web-workers/react';
import {RemoteReceiver, RemoteRenderer} from '@remote-ui/react/host';

const createWorker = createWorkerFactory(() => import('./worker'));

const COMPONENTS = {Card, Button};
const THIRD_PARTY_SCRIPT = 'https://third-party.com/remote-app.js';

export function WorkerRenderer() {
  const receiver = useMemo(() => new RemoteReceiver());
  const worker = useWorker(createWorker);

  useEffect(() => {
    // This runs the exported run() function from our worker
    worker.run(THIRD_PARTY_SCRIPT, receiver.receive);
  }, [receiver, worker]);

  return <RemoteRenderer receiver={receiver} components={COMPONENTS} />;
}

// The "native" implementations of our remote components:

function Card({children}: {children: ReactNode}) {
  return <div className="Card">{children}</div>;
}

function Button({
  children,
  onPress,
}: {
  children: ReactNode;
  // Functions passed over @remote-ui/rpc always return promises,
  // so make sure it’s a considered return type.
  onPress(): void | Promise<void>;
}) {
  return (
    <button type="button" onClick={() => onPress()}>
      {children}
    </button>
  );
}
```

There's a lot of moving pieces in the example above. The `@remote-ui` libraries have APIs to simplify this code depending on your use case, but it’s an important part of this library that this kind of separation of responsibilities is respected.

By separating out worker creation, we allow you to define whatever API you want in your worker, and to construct them in a way that suits your needs (for instance, you may need to construct workers in an anonymous `iframe` to prevent `fetch` in the worker from being treated as same-origin requests). By separating out the `receiver`, which keeps track of the current state of the remote root, we allow you to execute the remote UI eagerly, which can be a useful technique to prefetch the next content to display in the background. Remote UI generally makes a tradeoff to optimize for maximum possible performance and an elegant experience of writing code in the remote environment, but that unfortunately means the host code can feel a little awkward.

With the code above in place, we now have a fully functional environment. Running this application should cause the worker to run its code when the `WorkerRenderer` component mounts. When the third-party code calls `root.mount()`, the initial representation of their UI will be sent to the UI thread and rendered using the host `Card` and `Button` implementations. However, the authorizing experience for the third-party code isn’t quite as nice as we’d like it to be. There is no type-checking to ensure that only valid components/ properties are supplied or that the code is using the available global API correctly, and if we need to add any stateful logic to our UI (for example, changing the content of the card on click), we’ll have to handle that all manually. These limitations are probably fine for simpler use cases, but as the API you expose this way expands, you will probably want to provide the third-party code with some additional developer niceties.

In this example, we’ll start by splitting out the definitions of the available components into an external library, like a public NPM package that could be used both by the application and the third-party. This code will use the `createRemoteReactComponent` helper from `@remote-ui/react` to expose the available "native" components as strongly typed React components. We’ll also export a function that will offer a strongly-typed alternative to calling your global `onRender` API directly:

```ts
// in @company/ui-api

import {
  RemoteRoot,
  createRemoteReactComponent,
  ReactPropsFromRemoteComponentType,
} from '@remote-ui/react';

// First type argument is a friendly name, second is the available
// props. We use the ReactPropsFromRemoteComponentType because it will take
// care of the `children` prop for us in a smart way.
export const Card = createRemoteReactComponent<'Card', {}>('Card');
export type CardProps = ReactPropsFromRemoteComponentType<typeof Card>;

export const Button = createRemoteReactComponent<
  'Button',
  {onPress(): void | Promise<void>}
>('Button');
export type ButtonProps = ReactPropsFromRemoteComponentType<typeof Button>;

export function onRender(
  renderer: (root: RemoteRoot<typeof Card | typeof Button>) => void,
) {
  (self as any).onRender(renderer);
}
```

Back in our application code, we can ensure we are providing valid host components by using the package as the single source of truth for the props of our `Card` and `Button` implementations:

```ts
// back in WorkerRenderer.tsx

import {CardProps, ButtonProps} from '@company/ui-api';

function Button({children, onPress}: ButtonProps) {
  // ...
}

function Card({children}: CardProps) {
  // ...
}
```

We can also update our worker entrypoint to use these components to indicate what components are valid for this remote root:

```ts
// back in worker.ts, focusing on our run export

import {Card, Button} from '@company/ui-api';

export function run(script: string, receiver: RemoteReceiver) {
  retain(receiver);

  importScripts(script);

  if (renderCallback != null) {
    const remoteRoot = createRemoteRoot({
      components: [Card, Button],
    });
    renderCallback(remoteRoot);
  }
}
```

Finally, the third-party can use these strongly-typed React components in their code. The `@remote-ui/react` library also provides a custom React renderer that takes a normal React component, and automatically sending any changes in that React tree through the remote root:

```tsx
// in the third-party code... (note, they would need to bundle their code!)

import React, {useState} from 'react';
import {render} from '@remote-ui/react';
import {onRender, Card, Button} from '@company/ui-api';

onRender((root) => {
  render(<App />, root);
});

function App() {
  const [cardContent, setCardContent] = useState('Card content');

  return (
    <Card>
      {cardContent}
      <Button
        onPress={() => {
          setCardContent('You’ve clicked!');
        }}
      >
        Click me!
      </Button>
    </Card>
  );
}
```

With these small changes, the third-party developer will get great feedback on the available components and properties (assuming they use an editor that supports TypeScript), and get all the power of React for running complex remote code.

### How it works

The core behavior of Remote UI is very simple. `createRemoteRoot` constructs an object that has a very small, DOM-like API for constructing, adding, removing, and updating components in the tree. `createRemoteRoot` is passed a function on initialization. When changes happen anywhere in the tree from a remote root, it sends a serialized copy of those changes to the function that it was initialized with. The `RemoteReceiver`, which has a `receive` method that can be used as the argument for `createRemoteRoot`, can take those messages and construct a matching representation of the tree on the host side. From there, host implementations (like the `RemoteRenderer` from `@remote-ui/react`) can take the state of the tree and render it to platform-native components.

Though you rarely saw it mentioned in the example above, `@remote-ui/rpc` plays the most critical role in making this system work. It augments two ends of a `postMessage`-like interface (e.g., the worker side and parent side of the `Worker` object) to allow passing objects even if they have function properties. Function properties are turned into proxies that implement function calling via message passing, all of which happens transparently for the rest of the `@remote-ui` libraries. The other libraries only need to do a bit of memory management housekeeping to dispose of proxied functions when they are no longer needed. The domain of Remote UI makes this fairly easy to do in the common case: the only thing that ever gets passed from the worker to the parent are component descriptions, which contain the type and properties of the components in the tree. We can hook in to when the properties are updated, or nodes are added or removed from the remote tree, to automatically release any references to functions that are no longer "live".

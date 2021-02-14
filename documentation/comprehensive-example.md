# Comprehensive example

> Note: this is not the simplest example of using the library. This example is presented to show you all of the different moving pieces of remote-ui, leading up to an explanation of how it works under the hood.

Integrating remote-ui into your application requires some planning, in order to determine the UI components that should be available for the remote context to render, and will require some way of packaging up code to run in that remote context. In this example, we will consider a [React](https://reactjs.org) application that uses [Webpack](https://webpack.js.org) to build its application code. The goal of this work is to expose a small, highly-controlled sandbox that will load third-party JavaScript and, when asked for by the application, will run that JavaScript to render dynamic UI. We want that third-party JavaScript to have the option to use React for their UI, because React offers an elegant state and component model that makes it easy to build features with complex business logic.

As you implement this feature, it's important to understand the two environments code will be executing in. The first is the "host" environment: this is the code that runs directly in the browser, like the rest of your current React application. This code has full access to the DOM, but in exchange, this code sits on the main thread and can block user interactivity. Minimizing the amount of code that runs in this environment is the main feature of remote-ui.

The second environment is the "remote" one. A remote environment in remote-ui can be anything that can execute JavaScript, and that can communicate via message passing. In the case of web applications, the best remote environment for running code that will output UI is a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). Web workers run in the browser (so latency is at a minimum), have the same JavaScript features as their parent page, are a fully isolated runtime environment, have minimal creation overhead, and, most importantly, run on a separate thread. Our example application will therefore use a worker to run the third-party code.

If you already have a React app running, then you already have a host environment, but you do not have any way of creating the remote environment.

The [`@remote-ui/web-workers` package](../packages/web-workers) provides some helpful tooling integrations that make it seamless to create web workers that work great with the rest of the `@remote-ui` libraries. In our case, we will use the [Babel](https://babeljs.io) and Webpack integrations to automatically produce files suitable for web workers on boundaries we create using the `createWorkerFactory` function, also provided by this library.

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
              configFile: false,
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

1. Add a global API that the third-party code can call to register a callback to run when we need to render some UI. We unfortunately need to rely on the global environment to share anything with the third-party code, because that code is not controlled by us at all. We will do this by providing a `onRender` global that will register a function to run on render. This function will accept a [`RemoteRoot`](../packages/core#remoteroot) object, which we will construct, as that is the interface this library provides for remote environments to interact with the UI components.

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
       const remoteRoot = createRemoteRoot(receiver);
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
       const remoteRoot = createRemoteRoot(receiver, {
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
  card.appendChild('Card contents');

  const button = root.createComponent('Button', {
    onPress() {
      console.log('Pressed!');
    },
  });
  button.appendChild('Click me');

  card.appendChild(button);
  root.appendChild(card);
  root.mount();
});
```

We‘ll come back to this example a little later, but for now, the third party at least has a safe, DOM-like abstraction for interacting with the UI from the remote environment. Or at least, they will, once we have finished our host-side implementation to actually map what a `Card` and `Button` from the worker will map to when rendered on the host. Let’s do that part next.

The [`@remote-ui/react`](../packages/react) library has a couple of utilities we can use to implement the host of our application. We’ll need two things: a receiver, that will take updates to the UI from the remote environment and save them in a way that the host can use them, and a component that can take the current state of the remote root and map it to native components. These map to the `RemoteReceiver` and `RemoteRenderer` exports from `@remote-ui/react/host`, respectively. `@remote-ui/react/host` also exports a useful hook, `useWorker`, that will instantiate the worker alongside the React component (and terminate it when the component unmounts).

```tsx
// back in WorkerRenderer.tsx

import {useMemo, useEffect, ReactNode} from 'react';
import {
  createRemoteReceiver,
  RemoteRenderer,
  useWorker,
  createController,
} from '@remote-ui/react/host';
import {createWorkerFactory} from '@remote-ui/web-workers';

const createWorker = createWorkerFactory(() => import('./worker'));

const CONTROLLER = createController({Card, Button});
const THIRD_PARTY_SCRIPT = 'https://third-party.com/remote-app.js';

export function WorkerRenderer() {
  const receiver = useMemo(() => createRemoteReceiver());
  const worker = useWorker(createWorker);

  useEffect(() => {
    // This runs the exported run() function from our worker
    worker.run(THIRD_PARTY_SCRIPT, receiver.receive);
  }, [receiver, worker]);

  return <RemoteRenderer receiver={receiver} controller={CONTROLLER} />;
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

By separating out worker creation, we allow you to define whatever API you want in your worker, and to construct them in a way that suits your needs (for instance, you may need to construct workers in an anonymous `iframe` to prevent `fetch` in the worker from being treated as same-origin requests). By separating out the `receiver`, which keeps track of the current state of the remote root, we allow you to execute the remote-ui eagerly, which can be a useful technique to prefetch the next content to display in the background. remote-ui generally makes a tradeoff to optimize for maximum possible performance and an elegant experience of writing code in the remote environment, but that unfortunately means the host code can feel a little awkward.

With the code above in place, we now have a fully functional environment. Running this application should cause the worker to run its code when the `WorkerRenderer` component mounts. When the third-party code calls `root.mount()`, the initial representation of their UI will be sent to the UI thread and rendered using the host `Card` and `Button` implementations. However, the authorizing experience for the third-party code isn’t quite as nice as we’d like it to be. There is no type-checking to ensure that only valid components/ properties are supplied or that the code is using the available global API correctly, and if we need to add any stateful logic to our UI (for example, changing the content of the card on click), we’ll have to handle that all manually. These limitations are probably fine for simpler use cases, but as the API you expose this way expands, you will probably want to provide the third-party code with some additional developer niceties.

In this example, we’ll start by splitting out the definitions of the available components into an external library, like a public NPM package that could be used both by the application and the third-party. This code will use the `createRemoteReactComponent` helper from `@remote-ui/react` to expose the available "native" components as strongly typed React components. We’ll also export a function that will offer a strongly-typed alternative to calling your global `onRender` API directly:

```ts
// in @company/ui-api

import {
  RemoteRoot,
  createRemoteReactComponent,
  ReactPropsFromRemoteComponentType,
} from '@remote-ui/react';

export interface CardProps {}
// First type argument is a friendly name, second is the available
// props. We use the ReactPropsFromRemoteComponentType because it will take
// care of the `children` prop for us in a smart way.
export const Card = createRemoteReactComponent<'Card', CardProps>('Card');

export interface ButtonProps {
  onPress(): void;
}

export const Button = createRemoteReactComponent<'Button', ButtonProps>(
  'Button',
);

export function onRender(
  renderer: (root: RemoteRoot<typeof Card | typeof Button>) => void,
) {
  self.onRender(renderer);
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
    const remoteRoot = createRemoteRoot(receiver, {
      components: [Card, Button],
    });
    renderCallback(remoteRoot);
  }
}
```

Finally, the third-party can use these strongly-typed React components in their code. The `@remote-ui/react` library also provides a custom React renderer that takes a normal React component, and automatically sends any changes in that React tree through the remote root:

```tsx
// in the third-party code... (note, they would need to bundle their code!)

import {useState} from 'react';
import {render} from '@remote-ui/react';
import {onRender, Card, Button} from '@company/ui-api';

onRender((root) => {
  render(<App />, root, () => {
    root.mount();
  });
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

Third party developers are also free to choose an abstraction that works for them. React isn’t everyone’s cup of tea, and at about ~20kb after gzip, the custom React reconciler it requires is a pretty hefty price to pay for a small UI script. Luckily, the small, DOM-like model at the heart of remote-ui means that it can support many different authoring abstractions. The third-party developer could decide to instead use [`@remote-ui/htm`](../packages/htm), which allows them to author static templates with a friendly, JSX-like syntax, using the exact same components you provided earlier, all for only ~500 _bytes_ after gzip:

```tsx
import {createHtm, append} from '@remote-ui/htm';
import {onRender, Card, Button, Text} from '@company/ui-api';

onRender((root) => {
  const htm = createHtm(root);

  append(
    htm`
      <${Card}>
        <${Button} onPress=${() => console.log('Pressed!')}>Submit<//>
        <${Text} subdued>You’ll have a chance to review your purchase<//>
      <//>
    `,
    root,
  );
});
```

So far, the remote scripts we’ve seen have been very simple pieces of UI, doing no more than logging a message when pressed. In a real implementation of remote-ui, there is another important class of API you should consider: the data and functions you make available to the remote scripts. There are two ways to provide this kind of API:

1. **Providing additional global methods**. Earlier, we defined our global API — `self.onRender` — which stored a callback to run when the main thread calls the sandbox’s `run()` function. We can expose other globals, too, which can perform actions on behalf of the remote script. We’ll demonstrate this by writing an `authenticatedFetch` global, where we will allow any remote code to fetch an API endpoint in our application, and we will have the main thread handle this action by running a `fetch` on the remote code’s behalf. We’ll start with the definition, which will go in our `worker.ts`:

   ```ts
   // in worker.ts

   // ... the existing global API...

   // Our new, globally-available function
   self.authenticatedFetch = (endpoint: string) => {};
   ```

   Our example application can use this at any time, like in response to a user event:

   ```tsx
   // in the third-party code... (note, they would need to bundle their code!)

   import {useState} from 'react';
   import {render} from '@remote-ui/react';
   import {onRender, Card, Button} from '@company/ui-api';

   onRender((root) => {
     render(<App />, root, () => {
       root.mount();
     });
   });

   function App() {
     const [cardContent, setCardContent] = useState();

     return (
       <Card>
         {cardContent}
         <Button
           onPress={() => {
             // Make sure you handle more edge cases in data fetching than we’re
             // doing here :)
             self.authenticatedFetch('/products.json').then((data) => {
               setCardContent(data.products[0].title);
             });
           }}
         >
           Fetch products
         </Button>
       </Card>
     );
   }
   ```

   The implementation of this function needs a way to talk back to the main thread. By default, `@remote-ui/web-workers` only exposes functionality on the side of the web worker. If you want to expose functionality on the host side, you will first need to use the `endpoint` object that is available only to the trusted, sandbox code, and can be imported from `@remote-ui/web-workers/worker`. This [`@remote-ui/rpc` `Endpoint`](../packages/rpc#endpoint) is the communication hub from the worker to the main thread. It exposes functionality from the worker and, if we teach it what functionality is available on the main thread, it can call into that functionality, too. Here, we will tell the worker that there is an `authenticatedFetch` method exposed by the main thread, and we will call it from our `self.authenticatedFetch` global function.

   ```ts
   // in worker.ts

   import {endpoint} from '@remote-ui/web-workers/worker';

   endpoint.callable('authenticatedFetch');

   // Our new, globally-available function
   self.authenticatedFetch = (endpoint: string) => {
     return endpoint.call.authenticatedFetch(endpoint);
   };
   ```

   Finally, we need to expose this new method on each worker sandbox we create. We can do so with the help of [`@remote-ui/web-workers`’ `expose` utility](../packages/web-workers#expose), which does the work of getting the `Endpoint` for a `Worker` and exposing the methods you pass in:

   ```tsx
   // back in WorkerRenderer.tsx

   import {useMemo, useEffect, ReactNode} from 'react';
   import {
     createRemoteReceiver,
     RemoteRenderer,
     useWorker,
     createController,
   } from '@remote-ui/react/host';
   import {createWorkerFactory, expose} from '@remote-ui/web-workers';

   const createWorker = createWorkerFactory(() => import('./worker'));

   const CONTROLLER = createController({Card, Button});
   const THIRD_PARTY_SCRIPT = 'https://third-party.com/remote-app.js';

   export function WorkerRenderer() {
     const receiver = useMemo(() => createRemoteReceiver());
     const worker = useWorker(createWorker);

     useEffect(() => {
       expose(worker, {
         authenticatedFetch: (endpoint: string) =>
           fetch(endpoint, {
             headers: {'X-Auth-Token': 'legit-auth'},
           }),
       });

       // This runs the exported run() function from our worker
       worker.run(THIRD_PARTY_SCRIPT, receiver.receive);
     }, [receiver, worker]);

     return <RemoteRenderer receiver={receiver} controller={CONTROLLER} />;
   }
   ```

   Now, whenever the remote script in this web worker runs `self.authenticatedFetch`, the main thread will transparently receive and handle that call, returning its results to the sandbox code.

2. **Providing data when you run the remote script**. When you are providing large collections of data, or data that may only be relevant to individual render calls, you probably want to pass this data to the `onRender` function directly. We are already passing one argument to this function — the `RemoteRoot` that allows the script to attach UI — and it’s certainly possible to pass more. In this example, we’ll pass a user object, containing a string `id` and a function to retrieve additional details.

   First, let’s augment the definition of the `onRender` callback to include this additional argument. Our `run` function, which is exposed to the main thread, will also need to accept, and pass along, this new argument:

   ```tsx
   // in worker.ts

   import {createRemoteRoot, RemoteRoot, RemoteReceiver} from '@remote-ui/core';

   interface User {
     id: string;
     getDetails(): Promise<{occupation?: string}>;
   }

   type RenderCallback = (root: RemoteRoot, user: User) => void;

   let renderCallback: RenderCallback | undefined;

   self.onRender = (callback: RenderCallback) => {
     renderCallback = callback;
   };

   export function run(
     script: string,
     receiver: createRemoteReceiver,
     user: User,
   ) {
     // Functions you get from the UI thread that you want to "keep alive"
     // outside the scope of the function in which they were received need
     // to be manually retained. See @remote-ui/rpc documentation for details.

     retain(receiver);

     importScripts(script);

     if (renderCallback != null) {
       const remoteRoot = createRemoteRoot(receiver);
       renderCallback(remoteRoot, user);
     }
   }
   ```

   When we run this remote script, our main thread code now needs to pass the `user` object to the worker. Thanks to the RPC library at the heart of remote-ui, you can do so by passing a plain object, including functions, without any additional configuration:

   ```tsx
   // back in WorkerRenderer.tsx

   import {useMemo, useEffect, ReactNode} from 'react';
   import {
     createRemoteReceiver,
     RemoteRenderer,
     useWorker,
     createController,
   } from '@remote-ui/react/host';
   import {createWorkerFactory, expose} from '@remote-ui/web-workers';

   const createWorker = createWorkerFactory(() => import('./worker'));

   const CONTROLLER = createController({Card, Button});
   const THIRD_PARTY_SCRIPT = 'https://third-party.com/remote-app.js';

   export function WorkerRenderer() {
     const receiver = useMemo(() => createRemoteReceiver());
     const worker = useWorker(createWorker);

     useEffect(() => {
       worker.run(THIRD_PARTY_SCRIPT, receiver.receive, {
         id: 'gid://User/1',
         async getDetails() {
           const response = await fetch('/user.json');
           const json = await response.json();

           return {occupation: json.occupation};
         },
       });
     }, [receiver, worker]);

     return <RemoteRenderer receiver={receiver} controller={CONTROLLER} />;
   }
   ```

   Most importantly, our remote code can now be updated to receive, and use, this new `user` argument:

   ```tsx
   import {createHtm, append} from '@remote-ui/htm';

   self.onRender((root, user) => {
     const htm = createHtm(htm);

     append(
       htm`
         <Card>
           Details for user ${user.id}
         <//>
       `,
       root,
     );
   });
   ```

   If you intend on “holding on” to the `user` object after this `onRender` function has returned, you must do a bit of additional memory management to prevent the `user.getDetails` function. `@remote-ui/rpc` is proxying this function from the main thread to the worker, but you must instruct the RPC layer that you are done with the function before it can be garbage collected. You can tell remote-ui that you are holding on to a function (or an object or array that has nested functions), and that you are done with that function, by calling [`@remote-ui/rpc`’s `retain()` and `release()`](../packages/rpc), respectively.

   ```tsx
   import {retain} from '@remote-ui/core';
   import {createHtm, append} from '@remote-ui/htm';

   self.onRender((root, user) => {
     const htm = createHtm(root);

     retain(user);

     append(
       htm`
         <Card>
           Details for user ${user.id}
           <Button onPress=${() =>
             user.getDetails().then((result) => {
               // Promise we won’t try to use it again!
               release(user);
               console.log(result);
             })}>Get details<//>
         <//>
       `,
       root,
     );
   });
   ```

   Instead of putting this burden on the remote script itself, we could have added the additional `retain` and `release` calls to our global `run()` function. Where you place this responsibility depends on the developer experience you are trying to provide for authors of these remote scripts.

   Please read through [`@remote-ui/rpc`’s documentation](../packages/rpc) for additional details on when remote-ui will automatically manage memory for you, and when you must do so yourself.

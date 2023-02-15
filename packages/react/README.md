# `@remote-ui/react`

This library provides a custom React renderer that gives you the full power of React for your remote application, and provides an optional host layer that makes it easy for existing React apps to integrate a remote root. For a full overview of how `@remote-ui/react` can fit in with the different pieces of remote-ui, you can refer to our [comprehensive example](../../README.md#example).

## Installation

Using `yarn`:

```
yarn add @remote-ui/react
```

or, using `npm`:

```
npm install @remote-ui/react --save
```

### React peer dependencies

This package also has peer dependencies on a few React-related packages, but the versions you need depend on the version of React you are using:

**React 17.x.x**: you will need to have React installed. Additionally, if you are in the “remote” environment, you will need a dependency on `react-reconciler` between greater than or equal to `0.26.0`, and less than `0.28.0`:

```
yarn add react@^17.0.0 react-reconciler@^0.27.0

# or, with `npm`:

npm install react@^17.0.0 react-reconciler@^0.27.0 --save
```

**React 18.x.x and later**: you will need to have React installed. Additionally, if you are in the “remote” environment, you will need a dependency on `react-reconciler` greater than or equal to `0.28.0`:

```
yarn add react@^18.0.0 react-reconciler@">=0.28.0"

# or, with `npm`:

npm install react@^18.0.0 react-reconciler@">=0.28.0" --save
```

If you are only using the utilities for [React host applications](#host-environment), you do not need to declare a dependency on `react-reconciler`.

## Usage

### Remote environment

#### `createRoot()`

The main entrypoint for this package, `@remote-ui/react`, provides the custom React renderer that outputs instructions to a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot) object. This lets you use the remote-ui system for communicating patch updates to host components over a bridge, but have React help manage your stateful application logic.

To run a React app against a `RemoteRoot`, use the `createRoot` function exported by this library. This API has a similar signature to [the equivalent `react-dom` API](https://reactjs.org/docs/react-dom-client.html#createroot), where you first pass the the remote root you are targeting, and then render your React component into it:

```tsx
// For convenience, this library re-exports several values from @remote-ui/core, like createRemoteRoot
import {createRoot, createRemoteRoot} from '@remote-ui/react';

// a remote component — see implementation below for getting strong
// typing on the available props.
const Button = 'Button';

// Assuming we get a function that will communicate with the host...
const channel = () => {};

const remoteRoot = createRemoteRoot(channel, {
  components: [Button],
});

function App() {
  return <Button onClick={() => console.log('clicked!')}>Click me!</Button>;
}

createRoot(remoteRoot).render(<App />);
```

As you add, remove, and update host components in your React tree, this renderer will output those operations to the `RemoteRoot`. Since remote components are just a combination of a name and allowed properties, they map exactly to React components, which behave the same way.

Updating the the root React element for a given remote root can be done by calling the `render()` method again. For example, the root React element can be updated in an effect to receive updated props when they change:

```tsx
import {useEffect, useMemo} from 'react';
import {createRoot, createRemoteRoot} from '@remote-ui/react';

// A remote component
const Button = createRemoteReactComponent<'Button', {onPress(): void}>(
  'Button',
);

function App({count, onPress}: {count: number; onPress(): void}) {
  return <Button onPress={onPress}>I was clicked {count} time(s)</Button>;
}

function MyRemoteRenderer() {
  const root = useMemo(() => {
    // Assuming we get a function that will communicate with the host...
    const channel = () => {};

    const remoteRoot = createRemoteRoot(channel, {
      components: [Button],
    });

    return createRoot(remoteRoot);
  }, []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // We update the root component by calling `render` whenever `count` changes
    root.render(
      <App count={count} onPress={() => setCount((count) => count + 1)} />,
    );
  }, [count, root]);
}
```

#### `createRemoteReactComponent()`

In the example above, our `Button` component was not strongly typed. Like with [`@remote-ui/core`’s `createRemoteComponent`](../core#createremotecomponent), We can use the `createRemoteReactComponent` function from this library to create a strongly typed component to use. `@remote-ui/react`’s API is the exact same as `createRemoteComponent` (including the same type arguments), but the value returned is both a `RemoteComponentType` _and_ a `ReactComponentType`, both with appropriate prop types.

```tsx
import {createRemoteReactComponent} from '@remote-ui/react';

const Button = createRemoteReactComponent<'Button', {onPress(): void}>(
  'Button',
);

// Type error, because onPress is missing!
const button = <Button>Save</Button>;
```

If you have a situation where you have separate packages for React and non-React components (e.g., to support the smaller bundle size of using only the core library), you can pass the result of calling `@remote-ui/core`’s `createRemoteComponent` to this version of the function, and the props will be inferred automatically.

```tsx
import {createRemoteComponent} from '@remote-ui/core';
import {createRemoteReactComponent} from '@remote-ui/react';

const Button = createRemoteComponent<'Button', {onPress(): void}>('Button');
const ReactButton = createRemoteReactComponent(Button);

// Still a type error!
const button = <Button>Save</Button>;
```

#### `RemoteFragment`

In the example above, in order to have icon component as a prop for the Button component, you can use a `RemoteFragment`:

```tsx
import {createRemoteComponent, RemoteFragment} from '@remote-ui/core';
import {createRemoteReactComponent} from '@remote-ui/react';

interface IconProps {
  src: string;
}
const Icon = createRemoteComponent<'Icon', IconProps>('Icon');
const ReactIcon = createRemoteReactComponent(Icon);

interface ButtonProps {
  icon: RemoteFragment;
  onPress(): void;
}
const Button = createRemoteComponent<'Button', ButtonProps>('Button');
const ReactButton = createRemoteReactComponent(Button, {
  fragmentProps: ['icon'],
});

const button = (
  <ReactButton icon={<ReactIcon src="icon-src" />} onPress={() => {}}>
    Save
  </ReactButton>
);
```

`icon` prop in `ReactButton` is automatically converted to a ReactElement. If you want to have explicit type of ReactButtonProps, you can use `ReactPropsFromRemoteComponentType` as follow:

```tsx
import {ReactPropsFromRemoteComponentType} from '@remote-ui/react';

type ReactButtonProps = ReactPropsFromRemoteComponentType<typeof Button>;
```

You can also mix RemoteFragment with other primitive types like below:

```tsx
import {createRemoteComponent, RemoteFragment} from '@remote-ui/core';
import {createRemoteReactComponent} from '@remote-ui/react';

interface IconProps {
  src: string;
}
const Icon = createRemoteComponent<'Icon', IconProps>('Icon');
const ReactIcon = createRemoteReactComponent(Icon);

interface ButtonProps {
  icon: string | RemoteFragment;
  onPress(): void;
}
const Button = createRemoteComponent<'Button', ButtonProps>('Button');
const ReactButton = createRemoteReactComponent(Button, {
  fragmentProps: ['icon'],
});

const button1 = (
  <ReactButton icon="icon-src" onPress={() => {}}>
    Save
  </ReactButton>
);

const button2 = (
  <ReactButton icon={<ReactIcon src="icon-src" />} onPress={() => {}}>
    Save
  </ReactButton>
);
```

### Host environment

This package provides a second entrypoint, `@remote-ui/react/host`, with a collection of utilities for implementing the host side of a remote-ui environment in a React application. These utilities work for any React renderer, but will most commonly be used in applications that use `react-dom` or `react-native`. These host utilities take care of receiving the patch updates from a remote context, and maps the resulting component tree to a set of React components you provide.

To show these utilities in action, we’ll use the same `Button` example we have looked at for the remote APIs. The host environment for those examples needs to be able to render the real `Button` component with the props received from the remote environment. To do so, we first create our host-side `Button` component (we’ll assume we are in a DOM environment, so this component will render an HTML button):

```tsx
export function Button({onPress, children}) {
  return (
    <button type="button" onClick={() => onPress()}>
      {children}
    </button>
  );
}
```

The React component we will use to render our remote component tree needs to know how to map from a component name to component implementation. To do this, pass your host components to `createController()`, a function provided by this library:

```tsx
import {useMemo} from 'react';
import {createController} from '@remote-ui/react/host';

import {Button} from './Button';

function MyRemoteRenderer() {
  const controller = useMemo(() => createController({Button}), []);
  // ...
}
```

In addition to the `controller`, we need to create a [`RemoteReceiver` object](../core#remotereceiver). This object is responsible for accepting updates from the remote context, and turning them back into a tree of UI components on the host:

```tsx
import {useMemo, useEffect} from 'react';
import {createController, createRemoteReceiver} from '@remote-ui/react/host';

import {Button} from './Button';

function MyRemoteRenderer() {
  const controller = useMemo(() => createController({Button}), []);
  const receiver = useMemo(() => createRemoteReceiver(), []);

  useEffect(() => {
    // You’ll usually send the receiver.receive function to the remote
    // context, and use it to construct a `@remote-ui/core` `RemoteRoot`
    // object
    sendReceiverToRemoteContext(receiver.receive);
  }, [receiver]);

  // ...
}
```

Finally, you can pass these two objects to the `RemoteRenderer` component provided by this entrypoint, which will start listening for changes to the `receiver`, and render the host React component equivalent of the remote component tree.

```tsx
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
```

#### Customizing host component rendering

`createController` also allows for more fine-grained control of how individual remote components are rendered on the host. You can pass an object with a `renderComponent()` method as the second argument to `createController()`. This function will be called for each remote component, must return a `ReactNode`, and will include the following details:

- The `component` being rendered
- The `parent` of the component being rendered (either another component, or the “root”)
- The `receiver` (`RemoteReceiver`) object that is tracking updates to the remote root
- The `controller` object that is being created

This function is also called with a `renderDefault()` function. That function will return the result of rendering the React component with a matching name that you provided as the first argument to `createController`. You can use this function to conditionally apply the “default” logic, while applying your special logic to other cases.

The following example shows how you can use this fine-grained control. In this example, a `Modal` component is only allowed at the “root” of a remote tree, but all components _other_ than `Modal` can be rendered as nested components:

```tsx
import {KIND_ROOT} from '@remote-ui/core';
import {createController} from '@remote-ui/react/host';

import {Button} from './Button';
import {TextField} from './TextField';
import {Modal} from './Modal';

const controller = createController(
  {Modal, TextField, Button},
  {
    renderComponent({component, parent}, {renderDefault}) {
      // This component is being rendered to the “root”, so we will allow it
      // to be a modal, but anything else will just be ignored.
      if (parent.kind === KIND_ROOT) {
        return component.type === 'Modal' ? renderDefault() : null;
      }

      // This component is being rendered anywhere other than the “root”, so we
      // allow it to be any component *other* than a modal (which can only be
      // rendered at the top level)
      return component.type === 'Modal' ? null : renderDefault();
    },
  },
);
```

### Other exports

This package exports a helper type for extracting information from components created by `createRemoteReactComponent`:

- `ReactPropsFromRemoteComponentType` accepts any type as a type argument and, if it is a remote component, returns its prop types when used as a React component.

  ```ts
  import {
    createRemoteReactComponent,
    ReactPropsFromRemoteComponentType,
  } from '@remote-ui/react';

  const Button = createRemoteReactComponent<'Button', {onPress?(): void}>(
    'Button',
  );
  type ButtonProps = ReactPropsFromRemoteComponentType<typeof Button>; // {onPress?(): void; children: ReactNode}
  ```

It also exports a hook you can use to get direct, up-to-date access to a `StatefulRemoteSubscribable` created by `@remote-ui/async-subscription`:

```tsx
import type {StatefulRemoteSubscribable} from '@remote-ui/async-subscription';
import {useRemoteSubscription} from '@remote-ui/react';

function MyComponent({
  products,
}: {
  products: StatefulRemoteSubscribable<{id: string}[]>;
}) {
  const currentProducts = useRemoteSubscription(products);

  return <>{currentProducts.map((product) => product.id)}</>;
}
```

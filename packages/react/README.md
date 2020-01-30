# `@remote-ui/react`

This library provides a custom React renderer that gives you the full power of React for your remote application, and provides an optional host layer that makes it easy for existing React apps to integrate a remote root. For a full overview of how `@remote-ui/react` can fit in with the different pieces of Remote UI, you can refer to our [comprehensive example](../../#example).

## Installation

Using `yarn`:

```
yarn add @remote-ui/react
```

or, using `npm`:

```
npm install @remote-ui/react --save
```

## Usage

### Remote environment

#### `render()`

The main entrypoint for this package, `@remote-ui/react`, provides the custom React renderer that outputs instructions to a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot) object. This lets you use the Remote UI system for communicating patch updates to host components over a bridge, but have React help manage your stateful application logic. To run a React ap against a `RemoteRoot`, use the `render` function exported by this library, passing in the remote root and your root React component:

```tsx
// React usually has to be in scope when using JSX
import React from 'react';

// For convenience, this library re-exports several values from @remote-ui/core, like RemoteRoot
import {render, createRemoteRoot} from '@remote-ui/react';

// a host component — see implementation below for getting strong
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

render(<App />, remoteRoot);
```

As you add, remove, and update host components in your React tree, this renderer will output those operations to the `RemoteRoot`. Since remote components are just a combination of a name and allowed properties, they map exactly to React components, which behave the same way.

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
import {createRemoteComponent as coreCreateRemoteComponent} from '@remote-ui/core';
import {createRemoteReactComponent} from '@remote-ui/react';

const Button = coreCreateRemoteComponent<'Button', {onPress(): void}>('Button');
const ReactButton = createRemoteReactComponent(Button);

// Still a type error!
const button = <Button>Save</Button>;
```

### Other exports

This package exports a helper type for extracting information from components created by `createRemoteComponent`:

- `ReactPropsFromRemoteComponentType` accepts any type as a type argument and, if it is a remote component, returns its prop types when used as a React component.

  ```ts
  import {
    createRemoteComponent,
    ReactPropsFromRemoteComponentType,
  } from '@remote-ui/react';

  const Button = createRemoteComponent<'Button', {onPress?(): void}>('Button');
  type ButtonProps = ReactPropsFromRemoteComponentType<typeof Button>; // {onPress?(): void; children: ReactNode}
  ```

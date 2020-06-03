# `@remote-ui/htm`

This library provides a binding that converts [`htm`](https://github.com/developit/htm) templates into operations on a [`@remote-ui/core` `ReactRoot`](https://github.com/lemonmade/remote-ui/tree/master/packages/core#remoteroot).

## Installation

Using `yarn`:

```
yarn add @remote-ui/htm
```

or, using `npm`:

```
npm install @remote-ui/htm --save
```

## Usage

`@remote-ui/htm` provides two functions. The first, `htm`, is a [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates), which binds the main function from the `htm` library into a basic object structure. `render`, the second function exported from this library, takes this generated structure and a [`@remote-ui/core` `RemoteRoot`](https://github.com/lemonmade/remote-ui/tree/master/packages/core#remoteroot), and appends all of the resulting components into that root.

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {htm, render} from '@remote-ui/htm';

const root = createRemoteRoot(() => {});
const onPress = () => {};

render(htm`<Button primary onPress=${onPress}>Submit</Button>`, root);
root.mount();
```

This library only helps you create the initial structure of remote components. Any subsequent updates to that structure (for example, responding to a button press by changing its content) would be performed with the [`RemoteRoot` and `RemoteComponent` APIs](https://github.com/lemonmade/remote-ui/tree/master/packages/core).

`htm` supports [many handy syntax features](https://github.com/developit/htm#syntax-like-jsx-but-also-lit). Notably, if you have external definitions of the remote components available in your system, you can interpolate them as the type name within your markup.

```tsx
import {htm, render} from '@remote-ui/htm';
import {BlockStack, Button, Text} from 'my-remote-components';

render(
  htm`
    <${BlockStack} spacing="tight">
      <${Button} onPress=${() => console.log('Pressed!')}>Submit<//>
      <${Text} subdued>You’ll have a chance to review your purchase<//>
    <//>
  `,
  root,
);
```

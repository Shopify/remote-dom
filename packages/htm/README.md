# `@remote-ui/htm`

This library provides a binding that converts [`htm`](https://github.com/developit/htm) templates into operations on a [`@remote-ui/core` `ReactRoot`](../core#remoteroot).

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

`@remote-ui/htm` provides two functions. The first, `createHtm`, is a factory function that takes a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot), and returns a [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates). This tagged template binds the main function from the `htm` library into creating a tree of `@remote-ui/core` `RemoteComponent` and `RemoteText` objects. The second function, `append`, is a helper to call `appendChild()` on a `RemoteRoot` or `RemoteComponent` for each node in the tree returned by the tagged template.

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {createHtm, append} from '@remote-ui/htm';

const root = createRemoteRoot(() => {});
const htm = createHtm(root);

const onPress = () => {};

append(htm`<Button primary onPress=${onPress}>Submit</Button>`, root);
```

This library only helps you create the initial structure of remote components. Any subsequent updates to that structure (for example, responding to a button press by changing its content) would be performed with the [`RemoteRoot` and `RemoteComponent` APIs](../core).

`htm` supports [many handy syntax features](https://github.com/developit/htm#syntax-like-jsx-but-also-lit). Notably, if you have external definitions of the remote components available in your system, you can interpolate them as the type name within your markup.

```tsx
import {createRemoteRoot} from '@remote-ui/core';
import {createHtm, append} from '@remote-ui/htm';
import {BlockStack, Button, Text} from 'my-remote-components';

const root = createRemoteRoot(() => {});
const htm = createHtm(root);
const stack = root.createComponent(BlockStack);

append(
  htm`
    <${Button} onPress=${() => console.log('Pressed!')}>Submit<//>
    <${Text} subdued>You’ll have a chance to review your purchase<//>
  `,
  stack,
);
```

# `@remote-dom/react`

Utilities for rendering Remote DOM elements using [React](https://reactjs.org/).

## Installation

```sh
npm install @remote-dom/core @remote-dom/react --save # npm
pnpm install @remote-dom/core @remote-dom/react --save # pnpm
yarn add @remote-dom/core @remote-dom/react # yarn
```

## Usage

This library provides helpers for both the “host” and “remote” environments.

The `@remote-dom/react` entry provides wrappers for [`RemoteElement` subclasses](../core/README.md#remoteelement) that add some nice React-specific features on top of core Remote DOM library. Additionally, React DOM checks for a few browser globals that are not covered in the [core DOM polyfill](/packages/core/README.md#remote-domcorepolyfill). If you are using React in a Web Worker, you will also need to import [`@remote-dom/react/polyfill`](#polyfill) _before_ `react-dom` to ensure that these globals are available.

The `@remote-dom/react/host` provides the [`RemoteReceiver` class](../core/README.md#remotereceiver) and [`RemoteRootRenderer` component](#remoterootreceiver), which are used to render a tree of remote elements to the host environment using React.

### Remote

#### Polyfill

Some versions of React DOM check for a few specific browser globals on initialization. If you are polyfilling the DOM using [`@remote-dom/core/polyfill`](/packages/core/README.md#remote-domcorepolyfill), you will also need to import `@remote-dom/react/polyfill` _before_ `react-dom` to ensure that these globals are available.

```tsx
import '@remote-dom/core/polyfill';
import '@remote-dom/react/polyfill';

import {createRoot} from 'react-dom/client';

// Render your React app, as shown in the following examples.
```

#### `createRemoteComponent()`

As of version 18, React has minimal support for custom elements. To make the React integration a bit more seamless, Remote DOM provides the `createRemoteComponent()` function to create a React wrapper component around a custom element. This wrapper component will automatically have the TypeScript prop types it should, given the custom element definition you pass in. It will also ensure React props are passed along as element properties, and will convert any React elements passed as props to slotted children.

For example, imagine a `ui-card` custom element that takes a `header` slot, which should be used on a `ui-heading` custom element:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class Card extends RemoteElement {
  static get remoteSlots() {
    return ['header'];
  }
}

class Heading extends RemoteElement {}

customElements.define('ui-card', Card);
customElements.define('ui-heading', Heading);
```

The `createRemoteComponent()` wrapper will allow you to pass a `header` prop to the resulting React component, which can be any other React element:

```tsx
import {createRoot} from 'react-dom/client';
import {createRemoteComponent} from '@remote-dom/react';

const Card = createRemoteComponent('ui-card', CardElement);
const Heading = createRemoteComponent('ui-heading', HeadingElement);

createRoot(document.querySelector('#root')).render(
  <Card header={<Heading>Hello, world!</Heading>}>
    This is the body of the card.
  </Card>,
);
```

To make this work, the wrapper component will wrap the React element prop in a `<remote-fragment>` element, and place it as a child of the parent element. So, the above example could have been written manually like this:

```tsx
import {createRoot} from 'react-dom/client';

createRoot(document.querySelector('#root')).render(
  <ui-card>
    This is the body of the card.
    <remote-fragment slot="header">
      <ui-heading>Hello, world!</ui-heading>
    </remote-fragment>
  </ui-card>,
);
```

To disable this behavior, you can pass `{slotProps: {wrapper: false}}` option to `createRemoteComponent()`. This will cause any element props to be cloned with a `slot` prop, instead of wrapping them in a `<remote-fragment>` element.

```tsx
import {createRoot} from 'react-dom/client';
import {createRemoteComponent} from '@remote-dom/react';

const Card = createRemoteComponent('ui-card', CardElement, {
  slotProps: {
    wrapper: false,
  },
});

const Heading = createRemoteComponent('ui-heading', HeadingElement);

createRoot(document.querySelector('#root')).render(
  <Card header={<Heading>Hello, world!</Heading>}>
    This is the body of the card.
  </Card>,
);

// Now, renders this tree of HTML elements:
// <ui-card>
//   This is the body of the card.
//   <ui-heading slot="header">Hello, world!</ui-heading>
// </ui-card>
```

### Host

#### `RemoteReceiver`

The `@remote-dom/react/host` package re-exports the [`RemoteReceiver` class from `@remote-dom/core`](../core/README.md#remotereceiver). This object will store the state of the remote tree of elements, and the [`RemoteRootRenderer` component](#remoterootrenderer) expects to receive an instance of this class in order to map the remote tree to React components.

#### `createRemoteComponentRenderer()`

The [`RemoteRootRenderer` component](#remoterootrenderer) needs a map of which React components to render for each remote element. These components will receive a description of the remote element, but not much more. The `createRemoteComponentRenderer()` function can be used to create a wrapper React component that will automatically update whenever the properties or children of the associated remote element change. It will also provide some helpful transformations, like mapping child elements with `slot` attributes into props.

```tsx
import {createRemoteComponentRenderer} from '@remote-dom/react/host';

// Imagine we are implementing the host version of our `ui-card` custom element above,
// which allows a `header` slot. We’ll also have it accept a `subdued` property to
// customize its appearance.

const Card = createRemoteComponentRenderer(function Card({
  header,
  subdued,
  children,
}) {
  return (
    <div class={['Card', subdued && 'Card--subdued'].filter(Boolean).join(' ')}>
      {header && <div class="Card__Header">{header}</div>}
      {children}
    </div>
  );
});
```

#### `RemoteRootRenderer`

The `RemoteRootRenderer` component is used to render a tree of remote elements to the host environment using React. It expects a `receiver` prop, a [`RemoteReceiver` instance](../core/README.md#remotereceiver) that will store the state of the remote tree of elements. It also accepts a `components` prop, which provides the mapping of which React component to render for each remote element.

The following component shows an example of how you could render a tree of remote elements using React. You’ll need to hand the `receiver` object’s `connection` property to the remote environment; some examples of how to do this are shown in the [runnable Remote DOM examples](/examples/).

```tsx
import {createRoot} from 'react-dom/client';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  RemoteReceiver,
} from '@remote-dom/react/host';

// Create wrapper elements to render our actual UI components in response
// to remote elements. See the `createRemoteComponentRenderer()` section above.
const Card = createRemoteComponentRenderer(UICard);

const receiver = new RemoteReceiver();
// TODO: send the `receiver.connection` object to the remote environment,
// so it can send us updates about the tree of remote elements.

createRoot(document.querySelector('#root')).render(
  <RemoteRootRenderer
    receiver={receiver}
    components={new Map([['ui-card', Card]])}
  />,
);
```

#### `RemoteFragmentRenderer`

As noted above, Remote DOM may render a `<remote-fragment>` element to wrap a React element that is passed as a prop to a remote element. The `RemoteFragmentRenderer` component is used to render these fragments — it simply renders each child element inside of a React wrapper, which prevents any unnecessary wrapper elements from being introduced in the final DOM output.

```tsx
import {createRoot} from 'react-dom/client';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  SignalRemoteReceiver,
} from '@remote-dom/react/host';

// Same setup as above...

createRoot(document.querySelector('#root')).render(
  <RemoteRootRenderer
    receiver={receiver}
    components={
      new Map([
        ['ui-card', Card],
        // We allow `remote-fragment` elements to be rendered, which is the
        // name Remote DOM gives these wrapper elements by default. If you changed
        // the name using the `slotProps.wrapper` option, match that name here.
        ['remote-fragment', RemoteFragmentRenderer],
      ])
    }
  />,
  document.querySelector('#root'),
);
```

# `@remote-dom/preact`

Utilities for rendering Remote DOM elements using [Preact](https://preactjs.com/).

## Installation

```sh
npm install @remote-dom/core @remote-dom/preact --save # npm
pnpm install @remote-dom/core @remote-dom/preact --save # pnpm
yarn add @remote-dom/core @remote-dom/preact # yarn
```

## Usage

This library provides helpers for both the “host” and “remote” environments. The `@remote-dom/preact` entry provides wrappers for [`RemoteElement` subclasses](../core/README.md#remoteelement) that add some nice Preact-specific features on top of core Remote DOM library. The `@remote-dom/preact/host` provides the [`SignalRemoteReceiver` class](../signals/README.md#signalremotereceiver) and [`RemoteRootRenderer` component](#remoterootreceiver), which are used to render a tree of remote elements to the host environment using Preact.

### Remote

#### `createRemoteComponent()`

Preact has built-in support for web components, so you can use `@remote-dom/core` with Preact without any additional setup:

```ts
import {h, render} from 'preact';
import {RemoteElement} from '@remote-dom/core/elements';

// Define your remote element...
// @see https://github.com/Shopify/remote-dom/tree/main/packages/core/README.md#remoteelement
class MyElement extends RemoteElement {
  static get remoteAttributes() {
    return ['label'];
  }
}

customElements.define('my-element', MyElement);

// ...and render it using Preact components

render(
  h('my-element', {label: 'Hello, world!'}),
  document.querySelector('#root'),
);
```

However, we can make the Preact integration a bit more seamless by using the `createRemoteComponent()` function to create a wrapper Preact component. This wrapper component will automatically have the TypeScript prop types it should, given the custom element definition you pass in, and will correctly assign the props on the component to either attributes, properties, or event listeners.

```tsx
import {render} from 'preact';

const MyElementComponent = createRemoteComponent('my-element', MyElement);

render(
  <MyElementComponent label="Hello, world!" />,
  document.querySelector('#root'),
);
```

More importantly, though, this wrapper will also take care of adapting some parts of the custom element API to be feel more natural in a Preact application.

##### Event listener props

Custom Preact components generally expose events as callback props on the component. To support this pattern, the `createRemoteComponent()` wrapper can map specific props on the resulting Preact component to event listeners on underlying custom element.

Imagine a `ui-card` element with a clickable header. When clicked, the header will emit an `expand` event to the remote environment, and reveal the children of the `ui-card` element to the user. First, we define our custom element:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class Card extends RemoteElement {
  static get remoteEvents() {
    return ['expand'];
  }
}

customElements.define('ui-card', Card);
```

Then, we use the `createRemoteComponent()` helper function to create a wrapper Preact component with an `onExpand` prop, mapped to the `expand` event:

```tsx
import {createRemoteComponent} from '@remote-dom/preact';

const Card = createRemoteComponent('ui-card', CardElement, {
  eventProps: {
    onExpand: {event: 'expand'},
  },
});

render(
  <Card
    onExpand={() => {
      console.log('Card expanded!');
    }}
  >
    This is the body of the card.
  </Card>,
  document.querySelector('#root'),
);
```

##### Slotted children to Preact elements

The `createRemoteComponent` helper also supports mapping slotted children to Preact elements. Each top-level slot of the element’s children will be mapped to a prop with the same name on the Preact component.

For example, our `ui-card` custom element could take a `header` slot for customizing the title of the card:

```ts
import {RemoteElement} from '@remote-dom/core/elements';

class Card extends RemoteElement {
  static get remoteSlots() {
    return ['header'];
  }
}

class Text extends RemoteElement {}

customElements.define('ui-card', Card);
customElements.define('ui-text', Text);
```

The `createRemoteComponent()` wrapper will allow you to pass a `header` prop to the resulting Preact component, which can be any other Preact element:

```tsx
import {render} from 'preact';
import {createRemoteComponent} from '@remote-dom/preact';

const Card = createRemoteComponent('ui-card', CardElement);
const Text = createRemoteComponent('ui-text', TextElement);

render(
  <Card header={<Text>Hello, world!</Text>}>
    This is the body of the card.
  </Card>,
  document.querySelector('#root'),
);
```

To make this work, the wrapper component will wrap the Preact element prop in a `<remote-fragment>` element, and place it as a child of the parent element. So, the above example could have been written manually like this:

```tsx
import {render} from 'preact';

render(
  <ui-card>
    This is the body of the card.
    <remote-fragment slot="header">
      <ui-text>Hello, world!</ui-text>
    </remote-fragment>
  </ui-card>,
  document.querySelector('#root'),
);
```

To disable this behavior, you can pass `{slotProps: {wrapper: false}}` option to `createRemoteComponent()`. This will cause any element props to be cloned with a `slot` prop, instead of wrapping them in a `<remote-fragment>` element.

```tsx
import {render} from 'preact';
import {createRemoteComponent} from '@remote-dom/preact';

const Card = createRemoteComponent('ui-card', CardElement, {
  slotProps: {
    wrapper: false,
  },
});

const Text = createRemoteComponent('ui-text', TextElement);

render(
  <Card header={<Text>Hello, world!</Text>}>
    This is the body of the card.
  </Card>,
  document.querySelector('#root'),
);

// Now, renders this tree of HTML elements:
// <ui-card>
//   This is the body of the card.
//   <ui-text slot="header">Hello, world!</ui-text>
// </ui-card>
```

### Host

#### `SignalRemoteReceiver`

The `@remote-dom/preact/host` package re-exports the [`SignalRemoteReceiver` class from `@remote-dom/signals`](../signals/). This object will store the state of the remote tree of elements, and the [`RemoteRootRenderer` component](#remoterootrenderer) expects to receive an instance of this class in order to map the remote tree to Preact components.

#### `createRemoteComponentRenderer()`

The [`RemoteRootRenderer` component](#remoterootrenderer) needs a map of which Preact components to render for each remote element. These components will receive a description of the remote element, but not much more. The `createRemoteComponentRenderer()` function can be used to create a wrapper Preact component that will automatically update whenever the properties or children of the associated remote element change. The props passed to your Preact component will be the combined result of:

- The `properties` of the remote element
- The `attributes` of the remote element
- The `eventListeners` of the remote element, with each event listener being mapped to a prop named in the format `onEventName`
- The `children` of the remote element, where any children with a `slot` attribute are mapped to a prop with the same name

```tsx
import {createRemoteComponentRenderer} from '@remote-dom/preact/host';

// Imagine we are implementing the host version of our `ui-card` custom element above,
// which allows a `header` slot and `expand` event. We’ll also have it accept a `subdued` property to
// customize its appearance.

const Card = createRemoteComponentRenderer(function Card({
  header,
  subdued,
  onExpand,
  children,
}) {
  const isExpanded = useIsExpanded();

  return (
    <div
      class={[
        'Card',
        isExpanded.value && 'Card--expanded',
        subdued && 'Card--subdued',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <button
          class="Card__Header"
          onClick={() => {
            isExpanded.value = !isExpanded.value;
            if (isExpanded.value && onExpand) onExpand();
          }}
        >
          {header}
        </button>
      )}
      {children}
    </div>
  );
});
```

#### `RemoteRootRenderer`

The `RemoteRootRenderer` component is used to render a tree of remote elements to the host environment using Preact. It expects a `receiver` prop, a [`SignalRemoteReceiver` instance](../signals/README.md#signalremotereceiver) that will store the state of the remote tree of elements. It also accepts a `components` prop, which provides the mapping of which Preact component to render for each remote element.

The following component shows an example of how you could render a tree of remote elements using Preact. You’ll need to hand the `receiver` object’s `connection` property to the remote environment; some examples of how to do this are shown in the [runnable Remote DOM examples](/examples/).

```tsx
import {render} from 'preact';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  SignalRemoteReceiver,
} from '@remote-dom/preact/host';

// Create wrapper elements to render our actual UI components in response
// to remote elements. See the `createRemoteComponentRenderer()` section above.
const Card = createRemoteComponentRenderer(UICard);

const receiver = new SignalRemoteReceiver();
// TODO: send the `receiver.connection` object to the remote environment,
// so it can send us updates about the tree of remote elements.

render(
  <RemoteRootRenderer
    receiver={receiver}
    components={new Map([['ui-card', Card]])}
  />,
  document.querySelector('#root'),
);
```

#### `RemoteFragmentRenderer`

As noted above, Remote DOM may render a `<remote-fragment>` element to wrap a Preact element that is passed as a prop to a remote element. The `RemoteFragmentRenderer` component is used to render these fragments — it simply renders each child element inside of a Preact wrapper, which prevents any unnecessary wrapper elements from being introduced in the final DOM output.

```tsx
import {render} from 'preact';
import {
  createRemoteComponentRenderer,
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  SignalRemoteReceiver,
} from '@remote-dom/preact/host';

// Same setup as above...

render(
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

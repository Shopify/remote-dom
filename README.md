# Remote DOM

Remote DOM lets you recreate a tree of [DOM elements](https://developer.mozilla.org/en-US/docs/Web/API/Document_object_model/Using_the_Document_Object_Model) between JavaScript environments. You can think of it as an alternative to using an [`<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe): with Remote DOM, a developer builds up a tree of DOM elements in a sandboxed environment to render their user interface, just as they do inside an `<iframe>`. However, unlike an `<iframe>`, Remote DOM renders those DOM elements as part of the top-level HTML document, allowing UI elements to be more consistent, and preventing the need to load potentially-large JavaScript and CSS assets multiple times.

To help you use sandboxed JavaScript environments that are less expensive than a full `<iframe>`, Remote DOM also offers a minimal polyfill of key DOM APIs. This lets you use frameworks that would usually need to be run on the top-level HTML page, like [Preact](https://preactjs.com) and [Svelte](https://svelte.dev), inside of a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

## Examples

- [Minimal iframes](./examples/minimal-iframes/): an example using the smallest number of Remote DOM APIs to mirror basic HTML between a main page and an `<iframe>`.
- [Custom elements](./examples/custom-elements/): an example that defines custom elements, and synchronizes an HTML tree between a main page and an `<iframe>`.
- [Preact in a web worker](./examples/preact-web-worker/): an example that uses Remote DOM to render a Preact application inside of a web worker.
- [Svelte in a web worker, rendered by React](./examples/svelte-web-worker/): an example that uses Remote DOM to render a Svelte application inside of a web worker, which is rendered by a React application on the host page.

## Getting started

To use Remote DOM, you’ll need a web project that is able to host two different JavaScript environments: the “host” environment, which runs on the main HTML page and renders actual UI elements, and the “remote” environment, which is sandboxed and renders an invisible version of the DOM that will be mirrored by the host. You can [mix-and-match any combination of “host” and “remote” technologies](#examples) — you don’t need to use a particular JavaScript framework or backend technology to use Remote DOM. If you don’t know how to get started, we recommend starting a [Vite project](https://vitejs.dev) using whatever JavaScript library you prefer, as Vite lets you create `<iframe>` and Web Worker sandboxes with no extra configuration.

Once you have a project, install [`@remote-dom/core`](./packages/core/), which you’ll need to create the connection between host and remote environments:

```bash
npm install @remote-dom/core --save # npm
pnpm install @remote-dom/core --save # pnpm
yarn add @remote-dom/core # yarn
```

Next, on the “host” HTML page, you will need to create a “receiver”. This object will be responsible for receiving the updates from the remote environment, and mapping them to actual DOM elements. `@remote-ui/core` provides a few different types of receivers, but for now we use the `DOMRemoteReceiver`, which directly mirrors the DOM elements created remotely in the host HTML page. You’ll create a `DOMRemoteReceiver` and connect it to an existing HTML element in order to teach Remote DOM where to render the remote DOM elements:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receiver';

      const root = document.querySelector('#root');

      const receiver = new DOMRemoteReceiver();
      receiver.connect(root);
    </script>
  </body>
</html>
```

Our host is ready to receive elements to render, but we don’t have a remote environment yet. For this example, we will use a hidden iframe, but the [examples section](#examples) shows alternative sandboxes. We’ll add the iframe to the host HTML page we started above, and we’ll also listen for `postMessage` events from the iframe, in order to pass changes in the remote tree to our receiver:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>

    <iframe id="remote-iframe" src="/remote" hidden></iframe>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receiver';

      const root = document.querySelector('#root');
      const iframe = document.querySelector('#remote-iframe');

      const receiver = new DOMRemoteReceiver();
      receiver.connect(root);

      // We will send this message in the next step.
      window.addEventListener('message', ({source, data}) => {
        if (source !== iframe.contentWindow) return;
        receiver.receive(data);
      });
    </script>
  </body>
</html>
```

Next, let’s create the document that will be loaded into the iframe. It will use another utility provided by `@remote-ui/core`, `RemoteMutationObserver`, which extends the browser’s [`MutationObserver` interface](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) in order to communicate changes to the host.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root">
      <span style="color: red">Something went wrong!</span>
    </div>

    <script type="module">
      import {RemoteMutationObserver} from '@remote-dom/core/elements';

      // We will synchronize everything inside this element to the host.
      const root = document.querySelector('#root');

      // Send the mutations to the host via `postMessage`, which we just finished
      // adding a listener for in the previous step.
      const observer = new RemoteMutationObserver((mutations) => {
        window.parent.postMessage(mutations, '*');
      });

      observer.observer(root);
    </script>
  </body>
</html>
```

And just like that, the `<span>` we rendered in the `iframe` is now rendered in the host HTML page! You can see a [full example of this example here](./examples/minimal-iframes/).

### Custom elements

Now, just mirroring raw HTML isn’t very useful. Remote DOM works best when you define custom elements for the remote environment to render, which map to more complex, application-specific components on the host page. In fact, most of Remote DOM’s receiver APIs are geared towards you providing an allowlist of custom elements that the remote environment can render, which allows you to keep tight control over the visual appearance of the resulting output.

Remote DOM adopts the browser’s [native API for defining custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) to represent these “remote elements”. To make it easy to define custom elements that can communicate their changes to the host, `@remote-dom/core` provides the `RemoteElement` class. This class, which is a subclass of the browser’s [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), lets you define how properties, attributes, and event listeners on the element should be transferred.

As an example, let’s create a custom `ui-banner` element that renders an appropriately-styled notice banner on the host page. First, we’ll define a `ui-banner` custom element that will render on the host page. This is the “real” implementation, so we will need to implement the element’s `connectedCallback` in order to render it to the screen:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>

    <iframe id="remote-iframe" src="/remote" hidden></iframe>

    <script type="module">
      class UIBanner extends HTMLElement {
        connectedCallback() {
          // We will allow you to pass a `tone` attribute to the element, which
          // styles the banner according to our design system. We’ll see how to
          // use this in the remote environment in the next step.
          const tone = this.getAttribute('tone') ?? this.tone ?? 'neutral';

          const root = this.attachShadow({mode: 'open'});

          // We render a <slot> where we want the element’s children to go.
          root.innerHTML = `<div class="Banner Banner--${tone}"><slot></slot></div>`;
        }
      }

      customElements.define('ui-banner', UIBanner);
    </script>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receiver';

      const root = document.querySelector('#root');
      const iframe = document.querySelector('#remote-iframe');

      // In earlier examples, we did not pass any arguments, which allows the DOM
      // receiver to mirror any element it receives. By passing the `elements` option,
      // we are restricting the allowed elements to only the ones we list, which in this
      // case means only our `ui-banner` element can be rendered.
      const receiver = new DOMRemoteReceiver({
        elements: ['ui-banner'],
      });
      receiver.connect(root);

      window.addEventListener('message', ({source, data}) => {
        if (source !== iframe.contentWindow) return;
        receiver.receive(data);
      });
    </script>
  </body>
</html>
```

Next, we must also define that the `ui-banner` element exists in the remote environment. Unlike in the host environment, we do not need to render any actual HTML in this element — it is only used as an instruction for the host to render the actual element for you. With this element defined, we can render it, just as we rendered’d a `<span>` before, and it will be rendered as the real `<ui-banner>` on the host page.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root">
      <ui-banner tone="warning">Something went wrong!</ui-banner>
    </div>

    <script type="module">
      import {RemoteElement} from '@remote-dom/core/elements';

      class UIBanner extends RemoteElement {
        // For full details on defining remote elements, see the documentation
        // for `@remote-dom/core/elements`:
        // https://github.com/Shopify/remote-ui/tree/main/packages/core/
        static get remoteProperties() {
          return {tone: {type: String}};
        }
      }

      customElements.define('ui-banner', UIBanner);
    </script>

    <script type="module">
      import {RemoteMutationObserver} from '@remote-dom/core/elements';

      const root = document.querySelector('#root');

      const observer = new RemoteMutationObserver((mutations) => {
        window.parent.postMessage(mutations, '*');
      });

      observer.observer(root);
    </script>
  </body>
</html>
```

You can see an extended version of this example in the [custom elements example](./examples/custom-elements/).

## Learn more

You’ve now seen the key elements of parts of Remote DOM, but it can help you with a few more related tasks, like allowing event handlers on custom elements and rendering remote elements using front-end JavaScript frameworks. For full details on the core APIs Remote DOM provides for rendering remote elements, please refer to the [documentation for `@remote-dom/core`](./packages/core/). You can also see the flexibility of Remote DOM in the [examples section](#examples), where the library is combined with different tools and frameworks.

This repository also contains a few companion packages to `@remote-dom/core` that are used in some of the examples above:

- [`@remote-dom/preact`](./packages/react/), which provides [Preact](https://preactjs.com) wrapper components for the remote environment, and the ability to map remote elements directly to Preact components on the host.
- [`@remote-dom/react`](./packages/react/), which provides [React](https://react.dev) wrapper components for the remote environment, and the ability to map remote elements directly to React components on the host.
- [`@remote-dom/polyfill`](./packages/polyfill/), which provides a minimal polyfill of the DOM APIs needed to run Remote DOM inside a non-DOM environment, like a Web Worker.
- [`@remote-dom/signals`](./packages/signals/), which lets you receive remote updates into a tree of [signals](https://preactjs.com/guide/v10/signals/).

## Want to contribute?

Check out our [contributing guide](CONTRIBUTING.md).

## License

MIT &copy; [Shopify](https://shopify.com/), see [LICENSE.md](LICENSE.md) for details.

<a href="http://www.shopify.com/"><img src="https://cdn.shopify.com/assets2/brand-assets/shopify-logo-main-8ee1e0052baf87fd9698ceff7cbc01cc36a89170212ad227db3ff2706e89fd04.svg" alt="Shopify" width="200" /></a>

# Remote DOM

Remote DOM lets you take a tree of [DOM elements](https://developer.mozilla.org/en-US/docs/Web/API/Document_object_model/Using_the_Document_Object_Model) created in a sandboxed JavaScript environment, and render them to the DOM in a different JavaScript environment. This allows you to isolate potentially-untrusted code off the [main thread](https://developer.mozilla.org/en-US/docs/Glossary/Main_thread), but still allow that code to render a controlled set of UI elements to the main page.

The easiest way to use Remote DOM is to synchronize elements between a hidden [`<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) and the top-level page. To help you create more lightweight sandboxed JavaScript environments, Remote DOM also offers a [minimal polyfill of key DOM APIs](/packages/core/README.md#remote-domcorepolyfill). This lets you use a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to run JavaScript libraries that would usually need to be run on the top-level HTML page, like [Preact](https://preactjs.com) and [Svelte](https://svelte.dev).

## Examples

- [Getting started](./examples/getting-started/), where we show the most basic usage of Remote DOM in order to synchronize the text content of an element between a main page and an `<iframe>`. Run `pnpm example:getting-started` to see this example in your browser.
- [Custom element](./examples/custom-element/), where we extend the first example to allow the sandboxed environment to render custom button element. Run `pnpm example:custom-element` to see this example in your browser.
- [The “kitchen sink”](./examples/kitchen-sink/), where we show off a more fully-featured implementation of Remote DOM. This includes custom elements with properties, events, and methods, and the ability to sandbox UI in a web worker. The same sandboxed example is implemented in “vanilla” JavaScript, [htm](https://github.com/developit/htm), [Preact](https://preactjs.com), [React](https://react.dev), [Svelte](https://svelte.dev), and [Vue](https://vuejs.org). Run `pnpm example:kitchen-sink` to see this example in your browser.

## Building a project with Remote DOM

To use Remote DOM, you’ll need a web project that is able to run two JavaScript environments: the “host” environment, which runs on the main HTML page and renders actual UI elements, and the “remote” environment, which is sandboxed and renders an invisible version of the DOM that will be mirrored by the host. You can [mix-and-match any combination of “host” and “remote” technologies](#examples) — you don’t need to use a particular JavaScript framework or backend technology to use Remote DOM. If you don’t know how to get started, we recommend starting a [Vite project](https://vitejs.dev) using whatever JavaScript library you prefer, as Vite lets you create `<iframe>` and Web Worker sandboxes with no extra configuration.

Once you have a project, install [`@remote-dom/core`](./packages/core/), which you’ll need to create the connection between host and remote environments:

```bash
# npm
npm install @remote-dom/core --save
# pnpm
pnpm install @remote-dom/core --save
# yarn
yarn add @remote-dom/core
```

Next, on the “host” HTML page, you will need to create a “receiver”. This object will be responsible for receiving the updates from the remote environment, and mapping them to actual DOM elements.

`@remote-dom/core` provides a few different types of receivers, but for now we will use the [`DOMRemoteReceiver`](/packages/core/README.md#domremotereceiver), which directly mirrors the DOM elements created remotely in the host HTML page. That is, if the remote environment renders a `ui-button` custom element, a matching `ui-button` custom element will be created on the host page.

Create a `DOMRemoteReceiver` and call its `connect()` method on the element that should contain any children rendered by the remote environment:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

      const root = document.querySelector('#root');

      const receiver = new DOMRemoteReceiver();
      receiver.connect(root);
    </script>
  </body>
</html>
```

Our host is ready to receive elements to render, but we don’t have a remote environment yet. For this example, we will use a hidden iframe, but the [examples section](#examples) shows alternative sandboxes, like Web Workers. We’ll add the iframe to the host HTML page we started above, and we’ll also listen for `postMessage` events from the iframe, in order to pass changes in the remote tree to our receiver:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>

    <iframe id="remote-iframe" src="/remote" hidden></iframe>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receivers';

      const root = document.querySelector('#root');
      const iframe = document.querySelector('#remote-iframe');

      const receiver = new DOMRemoteReceiver();
      receiver.connect(root);

      // We will send this message in the next step.
      window.addEventListener('message', ({source, data}) => {
        if (source !== iframe.contentWindow) return;
        receiver.connection.mutate(data);
      });
    </script>
  </body>
</html>
```

Next, let’s create the document that will be loaded into the iframe. It will use another utility provided by `@remote-dom/core`, [`RemoteMutationObserver`](/packages/core/README.md#remotemutationobserver), which extends the browser’s [`MutationObserver` interface](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) in order to communicate changes to the host. Create a `RemoteMutationObserver`, and call its `observe()` method on the element that contains the elements you want to synchronize with the host:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>

    <script type="module">
      import {RemoteMutationObserver} from '@remote-dom/core/elements';

      // We will synchronize everything inside this element to the host.
      const root = document.querySelector('#root');

      // Send the mutations to the host via `postMessage`, which we just finished
      // adding a listener for in the previous step.
      const observer = new RemoteMutationObserver({
        mutate(mutations) {
          window.parent.postMessage(mutations, '*');
        },
      });

      observer.observe(root);
    </script>
  </body>
</html>
```

In our example, we’re not currently rendering any content in our “root” element. Let’s fix that by adding some text that will be updated over time:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>

    <script type="module">
      // Previous script’s contents, excluded for brevity.
      // ...
    </script>

    <script type="module">
      const root = document.querySelector('#root');

      let count = 0;

      setInterval(() => {
        count += 1;
        render();
      }, 1_000);

      function render() {
        root.textContent = `Rendered ${count} ${
          count === 1 ? 'second' : 'seconds'
        } ago`;
      }
    </script>
  </body>
</html>
```

And just like that, the text we render in the `iframe` is now rendered in the host HTML page! You can see a full version of this example in the [“getting started” example](./examples/getting-started/).

### Adding custom elements

Now, just mirroring HTML strings isn’t very useful. Remote DOM works best when you define custom elements for the remote environment to render, which map to more complex, application-specific components on the host page. In fact, most of Remote DOM’s receiver APIs are geared towards you providing an allowlist of custom elements that the remote environment can render, which allows you to keep tight control over the visual appearance of the resulting output.

Remote DOM adopts the browser’s [native API for defining custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) to represent these “remote custom elements”. To make it easy to define custom elements that can communicate their changes to the host, `@remote-dom/core` provides the [`RemoteElement` class](/packages/core/README.md#remoteelement). This class, which is a subclass of the browser’s [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), lets you define how properties, attributes, methods, and event listeners on the element should be transferred.

To demonstrate, let’s imagine that we want to allow our remote environment to render a `ui-button` element. This element will have a `primary` attribute, which sets it to a more prominent visual style. It will also trigger a `click` event when clicked.

First, we’ll create the remote environment’s version of `ui-button`. The remote version doesn’t have to worry about rendering any HTML — it’s only a signal to the host environment to render the “real” version. However, we do need to teach this element to communicate its `primary` attribute and `click` event to the host version of that element. We’ll do this using the [`RemoteElement` class provided by `@remote-dom/core`](/packages/core#remoteelement):

```html
<!doctype html>
<html>
  <body>
    <div id="root">
      <ui-button primary="">Clicked 0 times</ui-button>
    </div>

    <script type="module">
      import {RemoteElement} from '@remote-dom/core/elements';

      // For full details on defining remote elements, see the documentation
      // for `@remote-dom/core/elements`:
      // https://github.com/Shopify/remote-dom/tree/main/packages/core#elements
      class UIButton extends RemoteElement {
        static get remoteAttributes() {
          return ['primary'];
        }

        static get remoteEvents() {
          return ['click'];
        }
      }

      customElements.define('ui-button', UIButton);
    </script>

    <script type="module">
      // Now, we’ll render an instance of this button in the remote environment,
      // with its updates synchronized to the host based on the properties
      // we defined above.

      let count = 0;
      const button = document.querySelector('ui-button');

      button.addEventListener('click', () => {
        count += 1;

        button.textContent = `Clicked ${count} ${
          count === 1 ? 'time' : 'times'
        }`;
      });
    </script>

    <script type="module">
      // In order to proxy function properties and methods between environments,
      // we need a library that can serialize functions over `postMessage`. You can
      // use any library you wish, but this example will use [`@quilted/threads`](https://github.com/lemonmade/quilt/tree/main/packages/threads),
      // which is a small library that was designed to work well with Remote DOM.

      import {RemoteMutationObserver} from '@remote-dom/core/elements';
      import {createThreadFromInsideIframe, retain} from '@quilted/threads';

      const root = document.querySelector('#root');

      createThreadFromInsideIframe({
        expose: {
          // This `render()` method will kick off the process of synchronizing
          // changes between environments. It will be called on the host with a
          // `RemoteConnection` object, which you’ll generally get from one of
          // Remote DOM’s `Receiver` classes.
          render(connection) {
            retain(connection);
            const observer = new RemoteMutationObserver(connection);
            observer.observe(root);
          },
        },
      });
    </script>
  </body>
</html>
```

Finally, we need to provide a “real” implementation of our `ui-button` element, which will be rendered on the host page. The `DOMRemoteReceiver` we’ve used to receive elements in previous examples will automatically create an element matching the name provided in the remote environment, so we need to have a `ui-button` element defined in the host page. You can implement this element however you like, but for this example we’ll use the custom element APIs directly:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>

    <iframe id="remote-iframe" src="/remote" hidden></iframe>

    <script type="module">
      class UIButton extends HTMLElement {
        // By default, `DOMRemoteReceiver` will assign remote properties as properties,
        // but only if the element has a matching property defined. Otherwise, the remote
        // properties will be set as attributes. We’ll observe the `primary` attribute
        // in order to update our rendered content when that attribute changes. We’ll
        // define an `onClick` method, though, which will be set to the value of the `onClick`
        // remote property.
        static get observedAttributes() {
          return ['primary'];
        }

        connectedCallback() {
          const primary = this.hasAttribute('primary') ?? false;

          const root = this.attachShadow({mode: 'open'});

          // We render a <slot> where we want the element’s children to go.
          root.innerHTML = `<button class="Button"><slot></slot></button>`;

          if (primary) {
            root.querySelector('.Button').classList.add('Button--primary');
          }
        }

        attributeChangedCallback(name, oldValue, newValue) {
          if (name === 'primary') {
            const button = this.shadowRoot?.querySelector('.Button');

            if (button == null) return;

            if (newValue == null) {
              button.classList.remove('Button--primary');
            } else {
              button.classList.add('Button--primary');
            }
          }
        }
      }

      customElements.define('ui-button', UIButton);
    </script>

    <script type="module">
      import {DOMRemoteReceiver} from '@remote-dom/core/receivers';
      import {createThreadFromIframe, retain, release} from '@quilted/threads';

      const root = document.querySelector('#root');
      const iframe = document.querySelector('#remote-iframe');

      // In earlier examples, we did not pass any arguments, which allows the DOM
      // receiver to mirror any element it receives. By passing the `elements` option,
      // we are restricting the allowed elements to only the ones we list, which in this
      // case means only our `ui-button` element can be rendered.
      const receiver = new DOMRemoteReceiver({
        retain,
        release,
        elements: ['ui-button'],
      });
      receiver.connect(root);

      // Like our previous example, we need to use a library that can serialize
      // function properties over `postMessage`.
      const thread = createThreadFromIframe(iframe);
      thread.render(receiver.connection);
    </script>
  </body>
</html>
```

With those changes, you should now see your button rendering on the page, and responding to click events by updating its contents. You can see an extended version of this example in the [custom element example](./examples/custom-element/).

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

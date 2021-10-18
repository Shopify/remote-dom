import {
  retain,
  createEndpoint,
  fromInsideIframe,
} from 'https://cdn.skypack.dev/@remote-ui/rpc';
import {createRemoteRoot} from 'https://cdn.skypack.dev/@remote-ui/core';

// This creates the “remote” endpoint — the one that executes inside
// a hidden iframe, and has no access to the DOM of the main page.
const endpoint = createEndpoint(fromInsideIframe());

// We use `expose()` to provide methods that the other “side” of the
// communication channel can call. Here, we are exposing a single method:
// `render()`, which will be called by the main page when it is ready
// to render our remote UI tree to the page.
endpoint.expose({
  // `receiver` is a function that can be called to update UI on the main
  // page. `createRemoteRoot()` needs that function to communicate updates
  // on the remote tree of UI components.
  //
  // `api` is an object that the main page will pass with additional methods
  // we can call. These methods will be proxied to the main thread, where
  // the actual logic will be executed.
  async render(receiver, api) {
    // `receiver` is a function, and `api` is an object that has functions.
    // We will be calling both functions at various times in the future (as
    // UI updates happen, and when we call the `api.getMessage()` method).
    // If you ever use a function that was proxied across a `@remote-ui`
    // `Endpoint` object after the function in which you received it, you
    // must manually call the `retain()` method to ensure that the proxy
    // function is not marked for garbage collection.
    retain(receiver);
    retain(api);

    const root = createRemoteRoot(receiver);

    root.appendChild(
      root.createComponent(
        'Button',
        {
          async onPress() {
            // We use our `api` object to get some information from the main
            // page, which in this case will be the content of a text field only
            // the main page has access to.
            const message = await api.getMessage();
            console.log(`Message from the host: ${JSON.stringify(message)}`);
          },
        },
        'Log message in remote environment',
      ),
    );

    // The `mount()` method sends the initial UI representation to the main
    // page so it can be rendered. After calling `mount()`, any updates to
    // the remote tree of UI components is performed automatically.
    await root.mount();
  },
});

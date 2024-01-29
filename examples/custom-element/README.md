# Custom element example

This example shows the simplest setup using Remote DOM. It creates an `iframe` element to serve as the “remote” sandbox. In that sandbox, it defines a `ui-button` custom element, which allows the remote environment to render a styled button.

This example also shows how you can define event handlers that are called between environments, by showing a `click` event on the `ui-button` element. In order to support function calls over a `postMessage` sandbox, this example uses [`@quilted/threads`](https://github.com/lemonmade/quilt/tree/main/packages/threads), which was designed to work well with Remote DOM. However, you can use any other library that allows you to pass functions between JavaScript environments, like [comlink](https://github.com/GoogleChromeLabs/comlink).

## Running this example

From the root of the repository, run the following command:

```bash
pnpm --filter example-custom-element start
```

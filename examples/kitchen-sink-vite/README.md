# Example: remote-dom using Vite and a variety of DOM-friendly JavaScript libraries

```bash
# Run this command from the root of the repo:
pnpm run example:kitchen-sink-vite
```

This example shows how you can use remote-dom to implement off-main-thread rendering using a variety of JavaScript libraries and execution environments.

Using [Vite](https://vitejs.dev/), this example shows how to render DOM elements with remote-dom in two different sandboxing environments:

- An `iframe`
- A Web Worker

Because remote-dom is based on DOM APIs, the sandboxed code can use a variety of JavaScript libraries that are designed to work with the DOM. This example allows switching between the same UI, authored using four different libraries:

- “Vanilla” JavaScript
- React
- Preact
- Svelte

This example imports the local in-repo version of `@remote-dom` packages, so it is useful when working on changes to the libraries.

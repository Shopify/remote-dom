# “Kitchen sink” example

This example shows most of Remote DOM’s features in action. It includes multiple custom elements with properties, event listeners, and methods. It also shows how you can choose between using an `<iframe>` to sandbox remote code, or use Remote DOM’s polyfill to run DOM libraries in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/).

To show how thin a layer Remote DOM is on top of the basic DOM APIs you may already know, this example implements the “remote” code using a variety of techniques and libraries. In the [`app/remote/examples` directory](/examples/kitchen-sink/app/remote/examples/) You can see the same UI built using:

- “Vanilla” JavaScript, where we use standard DOM APIs to create our tree of elements
- [htm](https://github.com/developit/htm)
- [Preact](https://preactjs.com)
- [React](https://react.dev)
- [Svelte](https://svelte.dev)
- [Vue](https://vuejs.org)

## Running this example

From the root of the repository, run the following command:

```bash
pnpm --filter example-kitchen-sink start
```

## Why this example uses Vite 5

Keep this package on Vite 5, Svelte 4, and `@sveltejs/vite-plugin-svelte` 3 as a compatible set. Do not upgrade Vite independently or replace its declaration with the workspace's Vite catalog entry.

The Svelte Vite plugin versions that support Vite 6 and newer require Svelte 5. Svelte 5's client runtime depends on DOM behavior that Remote DOM's minimal Web Worker polyfill does not yet implement. An upgrade may work in the `<iframe>` sandbox while breaking the Web Worker sandbox, which is an essential part of this example.

Before upgrading this package:

1. Add the DOM behavior Svelte 5 requires to the Remote DOM polyfill.
2. Migrate the example to Svelte 5, including its `mount()` API.
3. Upgrade the Svelte Vite plugin and other framework plugins to versions compatible with the target Vite version.
4. Run the full Playwright suite against both iframe and Web Worker sandboxes.
5. Replace the package's Vite declaration with `catalog:` only after both sandbox modes pass.

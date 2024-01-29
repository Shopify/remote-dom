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

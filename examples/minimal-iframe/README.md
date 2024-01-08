# Minimal iframes example

This example shows the simplest setup using Remote DOM. It creates an `iframe` element to serve as the “remote” sandbox. In that sandbox, it only renders text, which it communicates manually to the parent document through `postMessage()`.

## Running this example

From the root of the repository, run the following command:

```bash
pnpm --filter example-minimal-iframes start
```

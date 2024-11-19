---
'@remote-dom/core': patch
'@remote-dom/polyfill': patch
---

Roll back mutation of `globalThis` and `globalThis.self` in `Window.setGlobal()`

This prevents the polyfill from interfering with globals like `globalThis.addEventListener`, which you may need to manage the communication between a sandboxed environment and the main thread.

In the future, we will likely change the polyfill to require you to explicitly install the polyfill, instead of it being done automatically when you `@remote-dom/core/polyfill`. At that point, we will reintroduce the ability to more faithfully replicate more DOM globals, like having `globalThis`, `globalThis.self`, and `globalThis.window` all refer to the same polyfilled `Window` object. To install this polyfill today and get back to the behavior introduced by [this PR](https://github.com/Shopify/remote-dom/pull/470), you can call the new `Window.setGlobalThis()` method:

```js
import {window, Window} from '@remote-dom/core/polyfill';

Window.setGlobalThis(window);
```

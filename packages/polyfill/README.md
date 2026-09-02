# `@remote-dom/polyfill`

A polyfill for the browser APIs used by Remote DOM. This allows you to use Remote DOM in environments that don’t have a native DOM, like [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

This package provides a low-level polyfill, with hooks that allow other libraries to intercept changes to the DOM. Unless you know you need this package, you probably want to import from [`@remote-dom/core/polyfill`](../core/README.md#remote-domcorepolyfill) instead, which uses the hooks provided by this library to automatically synchronize remote elements between environments.

## Installation

```sh
npm install @remote-dom/polyfill --save # npm
pnpm install @remote-dom/polyfill --save # pnpm
yarn add @remote-dom/polyfill # yarn
```

## Usage

This package provides a `Window` class, which implements a limited subset of the [`Window` browser interface](https://developer.mozilla.org/en-US/docs/Web/API/Window). You’ll create an instance of the `Window` class and install it to the global environment using the `Window.setGlobal()` method.

```ts
import {Window} from '@remote-dom/polyfill';

const window = new Window();
Window.setGlobal(window);

// Now you can use many important DOM APIs, like `document` and `Element`:
const div = document.createElement('div');
```

This process will install polyfilled versions of the following globals:

- [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window/window), [`parent`](https://developer.mozilla.org/en-US/docs/Web/API/Window/parent), [`top`](https://developer.mozilla.org/en-US/docs/Web/API/Window/top), and [`self`](https://developer.mozilla.org/en-US/docs/Web/API/Window/self) which are all references to the `Window` instance (`self` is only overwritten when it is not already defined, to avoid overwriting the Web Worker `self` binding).
- [`document`](https://developer.mozilla.org/en-US/docs/Web/API/Window/document)
- [`customElements`](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements)
- [`location`](https://developer.mozilla.org/en-US/docs/Web/API/Window/location) and [`navigator`](https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator), though these are just set to `globalThis.location` and `globalThis.navigator`.
- The [`Event`](https://developer.mozilla.org/en-US/docs/Web/API/Event), [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget), [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), [`Node`](https://developer.mozilla.org/en-US/docs/Web/API/Node), [`ParentNode`](https://developer.mozilla.org/en-US/docs/Web/API/ParentNode), [`ChildNode`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode), [`Document`](https://developer.mozilla.org/en-US/docs/Web/API/Document), [`DocumentFragment`](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment), [`CharacterData`](https://developer.mozilla.org/en-US/docs/Web/API/CharacterData), [`Comment`](https://developer.mozilla.org/en-US/docs/Web/API/Comment), [`Text`](https://developer.mozilla.org/en-US/docs/Web/API/Text), [`Element`](https://developer.mozilla.org/en-US/docs/Web/API/Element), [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), [`SVGElement`](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement), [`HTMLTemplateElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement), and [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) constructors.

`MutationObserver` is a compatibility stub: it provides the standard constructor and `observe()`, `disconnect()`, and `takeRecords()` methods, but does not track mutations, invoke its callback, or return records. Do not use it to observe changes in the polyfilled DOM.

## Extensions

Use `Window.with()` to create a reusable `Window` subclass with additional DOM
APIs or behavior. An extension is a function with two distinct parts:

- **The function body runs once per window, during construction.** It receives
  the new `Window` instance and can install or replace APIs on it, like
  `window.MutationObserver`. Use it for setup, not for reacting to DOM changes.
- **The returned hooks run for the lifetime of the window.** They subscribe to
  DOM operations on that window, such as creating elements, setting attributes,
  and adding event listeners, and are called each time one of those operations
  happens. Returning hooks is optional.

```ts
import {Window, type WindowExtension} from '@remote-dom/polyfill';

class CustomMutationObserver {}

const mutationObserverExtension: WindowExtension = (window) => {
  // Construction time: extend this window instance.
  window.MutationObserver = CustomMutationObserver;

  // Runtime: subscribe to DOM operations on this window.
  return {
    setAttribute(element, name, value) {
      // Notify observers associated with this window.
    },
  };
};

const ExtendedWindow = Window.with(mutationObserverExtension);
const window = new ExtendedWindow();
```

Extensions are installed in the order passed to `Window.with()` and across
chained `.with()` calls. The two parts compose differently:

- **Window APIs override.** Assignments like `window.MutationObserver = …` are
  plain property writes, so when multiple extensions set the same API, the last
  extension installed wins.
- **Hooks are additive.** Every installed extension’s hooks are called in
  installation order for each DOM operation.

Extensions are installed after the base window and its initial document have
been constructed, so their hooks do not observe the document’s bootstrap.

Assigning hooks directly through the exported `HOOKS` symbol is the legacy
integration API. New integrations should use extensions instead. Extension
hooks run first, followed by the legacy hook assigned through `window[HOOKS]`:

```ts
import {HOOKS} from '@remote-dom/polyfill';

window[HOOKS].createElement = (element) => {
  console.log('Creating element:', element);
};
```

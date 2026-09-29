# @remote-dom/polyfill

## 1.6.0

### Minor Changes

- [#620](https://github.com/Shopify/remote-dom/pull/620) [`4be18ef`](https://github.com/Shopify/remote-dom/commit/4be18ef20017587835e7275e3901cd5fcdcdc50e) Thanks [@andrewiggins](https://github.com/andrewiggins)! - Add `getElementById()` to `Document` and `DocumentFragment`, with reflected `Element.id` properties. Add `getElementsByTagName()` to `Document` and `Element`, supporting HTML, non-HTML, and wildcard descendant searches. `querySelector` and `querySelectorAll` accept a pre-parsed `Matcher[]` in addition to string selectors, with `MatcherType`, `Combinator`, `Matcher`, and `Part` exported from `selectors.ts`; `getElementById` and `getElementsByTagName` delegate to this shared selector engine instead of independent tree-walk implementations.

  Fixed `insertBefore()` leaving the previous sibling pointing at the reference node when inserting before a middle child, causing `NEXT` traversals (including `getElementById`) to skip the inserted subtree even though `childNodes` contained it, and return the inserted child as required by the DOM specification. Fixed `appendChild()` to return the appended child and `NodeList.item()` to return `null` for out-of-range indexes. Fixed case-insensitive HTML tag-name matching in the selector engine so `querySelector('DIV')` now matches `<div>` per the CSS spec. Fixed CSS-escaping issues so `getElementById` matches ids containing special characters (`.`, `:`, `#`, etc.) literally instead of treating them as selector syntax.

- [#625](https://github.com/Shopify/remote-dom/pull/625) [`ab6c549`](https://github.com/Shopify/remote-dom/commit/ab6c5494908a5efb53fc8e5534b2b2967b9cbe41) Thanks [@airhorns](https://github.com/airhorns)! - Add `getElementsByClassName()` to polyfilled documents and elements.

- [#624](https://github.com/Shopify/remote-dom/pull/624) [`e2a9eef`](https://github.com/Shopify/remote-dom/commit/e2a9eef700edd7f46a0cafb3e3a63d757ccfbc2e) Thanks [@airhorns](https://github.com/airhorns)! - Implement the standard `MutationObserver` methods for child, attribute, and character-data changes in the polyfilled DOM.

- [#652](https://github.com/Shopify/remote-dom/pull/652) [`0789d12`](https://github.com/Shopify/remote-dom/commit/0789d12f61ae3a93bd659543b4607eb496efa090) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Add composable `Window` extensions for installing DOM APIs and subscribing to DOM operations.

### Patch Changes

- [#681](https://github.com/Shopify/remote-dom/pull/681) [`fc245ba`](https://github.com/Shopify/remote-dom/commit/fc245ba6edd7622c4cccbd98e744d6934f04ab46) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Adopt complete subtrees, including initialized template content, during cross-document insertion so descendant and attribute mutations use the destination document.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`dff700b`](https://github.com/Shopify/remote-dom/commit/dff700bcc9610903ad4f9e6d8b23e6017f113af8) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Dispatch attribute hooks when mutating an attached attribute's value or nodeValue.

- [#679](https://github.com/Shopify/remote-dom/pull/679) [`da43e02`](https://github.com/Shopify/remote-dom/commit/da43e02ef1662763d242ed3b386b5b57130aaef3) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Correct chained combinators, whitespace, exact attribute equality, and scoped relative `:has()` selectors, including leading combinators, nested functional pseudo-classes, and ASCII-case-insensitive pseudo-class names.

- [#642](https://github.com/Shopify/remote-dom/pull/642) [`85cefcd`](https://github.com/Shopify/remote-dom/commit/85cefcd63efe62de20aadb2fa75d08485b4f1d96) Thanks [@andrewiggins](https://github.com/andrewiggins)! - Add the missing `CustomElementRegistry.initialize()` compatibility method so TypeScript 7 type checks cleanly.

- [#653](https://github.com/Shopify/remote-dom/pull/653) [`a9aee3e`](https://github.com/Shopify/remote-dom/commit/a9aee3e3834b621e0c9a4fd432a9eb674447403a) Thanks [@andrewiggins](https://github.com/andrewiggins)! - Make the Polyfill source compatible with type stripping by replacing TypeScript enums and a parameter property with erasable syntax.

- [#668](https://github.com/Shopify/remote-dom/pull/668) [`f4af17f`](https://github.com/Shopify/remote-dom/commit/f4af17fb2739cd6cbbf3adf52c1af1fb695c749b) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Preserve attribute ownership and linked-list integrity when attributes are reinstalled, replaced, removed, or reused.

- [#683](https://github.com/Shopify/remote-dom/pull/683) [`c13d18b`](https://github.com/Shopify/remote-dom/commit/c13d18b5469de4e87900d7c8123ad18b653f6d4e) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Throw a named `NotSupportedError` when cloning a document or importing one with `Document.importNode()`.

- [#681](https://github.com/Shopify/remote-dom/pull/681) [`9904cdd`](https://github.com/Shopify/remote-dom/commit/9904cdd79af5589c3b43e884e27fa2ce10721b58) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Make `ChildNode.replaceWith()`, `before()`, and `after()` validate all arguments before changing existing trees, preserve sibling argument order, and commit each operation before custom-element reactions run.

- [#664](https://github.com/Shopify/remote-dom/pull/664) [`8de0600`](https://github.com/Shopify/remote-dom/commit/8de06005c7e4d843182fbd403699dc2df67bee33) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Correct event dispatch lifecycle state, isolate composed paths, and defer listener registrations added during dispatch.

- [#692](https://github.com/Shopify/remote-dom/pull/692) [`ee48d52`](https://github.com/Shopify/remote-dom/commit/ee48d5290023a22de7632d7e652438514a1c1cfb) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Throw named DOM errors for invalid tree mutations and selector syntax.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`7eb8a18`](https://github.com/Shopify/remote-dom/commit/7eb8a18aa6753ac34e58d51cfda0533a99e88523) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Return `null` from `Document.textContent` and ignore assignments to preserve the initialized document structure.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`6ddc71f`](https://github.com/Shopify/remote-dom/commit/6ddc71f50e2c492d71c8b506eebc08cf40559199) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Clear parent children without creating an empty text node when assigning an empty `textContent` value, and finish the complete replacement before running custom-element reactions.

- [#662](https://github.com/Shopify/remote-dom/pull/662) [`e249e3e`](https://github.com/Shopify/remote-dom/commit/e249e3e8055b7878442ad72fdd2b151cdc3c0171) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Correct event listener identity and AbortSignal handling in the EventTarget polyfill.

- [#663](https://github.com/Shopify/remote-dom/pull/663) [`44e3b36`](https://github.com/Shopify/remote-dom/commit/44e3b3677920a43a98a92b8179470d7ede0dac96) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Fix event cancellation semantics for `preventDefault()`, `returnValue`, and `dispatchEvent()`.

- [#666](https://github.com/Shopify/remote-dom/pull/666) [`072b7e8`](https://github.com/Shopify/remote-dom/commit/072b7e8a68855144cc359d11107874007c043f2b) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Install missing event methods and error handlers consistently without replacing native global event delivery.

- [#685](https://github.com/Shopify/remote-dom/pull/685) [`fd4de61`](https://github.com/Shopify/remote-dom/commit/fd4de61b0be8eac8e056941f288f0592404b57dc) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Preserve character references and literal ampersands when parsing `innerHTML`, decode attribute references without double-escaping, handle nested `innerHTML` parsing from synchronous callbacks, and handle HTML void elements without nesting following content or serializing closing tags.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`fd8e186`](https://github.com/Shopify/remote-dom/commit/fd8e186d49bc1b3fa68ec0a26eb1de1a59c218c5) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Remove `slot` attributes without recreating them as empty attributes, keeping local and host state synchronized.

- [#688](https://github.com/Shopify/remote-dom/pull/688) [`5f0b228`](https://github.com/Shopify/remote-dom/commit/5f0b2281bddfc7ac37c64503f40f38f4f9b98243) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Default omitted CustomEvent detail values to null.

- [#688](https://github.com/Shopify/remote-dom/pull/688) [`08e3223`](https://github.com/Shopify/remote-dom/commit/08e3223a5fb340e80693168e04ed03a01764ef2a) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Include `Comment` nodes in the polyfill hook type contract.

- [#677](https://github.com/Shopify/remote-dom/pull/677) [`a629e25`](https://github.com/Shopify/remote-dom/commit/a629e25eb4eba6aae495257a40f30883b6dce53a) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Normalize and validate DOM element and attribute names across HTML and namespaced APIs, including `toggleAttribute()` and custom-element attribute reactions.

- [#688](https://github.com/Shopify/remote-dom/pull/688) [`e1acf97`](https://github.com/Shopify/remote-dom/commit/e1acf97baa3786d3284b6a0164ccc7206e3ec956) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Normalize `createTextNode()` hook data to match the created text node.

- [#685](https://github.com/Shopify/remote-dom/pull/685) [`0a39389`](https://github.com/Shopify/remote-dom/commit/0a3938987f46fd962ac84ed00808680852263df9) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Parse template descendants into template content and serialize that content with stack-safe HTML output.

- [#623](https://github.com/Shopify/remote-dom/pull/623) [`c3918c6`](https://github.com/Shopify/remote-dom/commit/c3918c61c3ee6b3aa6ec7fbf4d53aa76532ec29d) Thanks [@airhorns](https://github.com/airhorns)! - Fix `ChildNode.replaceWith()` throwing instead of replacing the node

  `replaceWith()` passed its arguments to `replaceChild()` in the wrong order — `replaceChild(newChild, oldChild)` was called as `parent.replaceChild(this, node)`, naming the incoming node as the child to replace. Since that node is usually fresh and has no parent, the reference check rejected it and every call threw `reference node is not a child of this parent`. It also read the following sibling off the incoming node rather than off `this`, so the remaining arguments had no correct insertion point to anchor to.

  The method now removes `this` and inserts the given nodes at its position, in argument order, anchored on the first following sibling that is not itself being moved. Strings become text nodes, calling it with no arguments removes the node (matching `remove()`), and a node with no parent is still left alone.

- [#714](https://github.com/Shopify/remote-dom/pull/714) [`516fcfa`](https://github.com/Shopify/remote-dom/commit/516fcfa4c4a04e8ff5a0e7c6b7da0d38d2dd1f57) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Resolve `Node.isDefaultNamespace()` with DOM locate-a-namespace semantics.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`23ceb4d`](https://github.com/Shopify/remote-dom/commit/23ceb4d22c62096ffdb00d4d107ab2cacdc54935) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Return removed and replaced nodes from `removeChild` and `replaceChild`.

- [#679](https://github.com/Shopify/remote-dom/pull/679) [`5466415`](https://github.com/Shopify/remote-dom/commit/54664151820316d9f655e9964de232854fdec5c4) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Return a NodeList-compatible collection from `querySelectorAll()`.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`d916fab`](https://github.com/Shopify/remote-dom/commit/d916fabc327a9352c1f3e8b2d37f939527d2027a) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Queue custom-element reactions so compound tree and attribute mutations commit their local state and Remote DOM hooks before callbacks run. Drain nested reactions in FIFO order, and finish the queue before rethrowing the first callback error.

- [#669](https://github.com/Shopify/remote-dom/pull/669) [`4b8bae9`](https://github.com/Shopify/remote-dom/commit/4b8bae9a507cf80492fb3b03975b90872b76465c) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Traverse wide and deep trees without overflowing the call stack during text collection, selector queries, and subtree connectivity updates. Prepare insertion snapshots transactionally before committing links, connectivity, hooks, and reactions so traversal failures preserve local and remote tree state. Capture lifecycle reactions in mutation order before emitting reentrant tree-mutation hook effects through a FIFO queue.

- [#676](https://github.com/Shopify/remote-dom/pull/676) [`6b42b09`](https://github.com/Shopify/remote-dom/commit/6b42b0980b3d2b01a1029ae1cab52345e0fb021a) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Make `CustomElementRegistry.define()` reject invalid custom element names and duplicate name or constructor registrations, matching browser behavior.

- [#660](https://github.com/Shopify/remote-dom/pull/660) [`685dff1`](https://github.com/Shopify/remote-dom/commit/685dff1a617c97afc5079edb742940bb6ff92022) Thanks [@andrewiggins](https://github.com/andrewiggins)! - Correct class selector whitespace parsing and return polyfilled `NodeList` collections from selector queries.

- [#683](https://github.com/Shopify/remote-dom/pull/683) [`7181475`](https://github.com/Shopify/remote-dom/commit/71814754bcd9a06155e9a284867c93031c133007) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Preserve established element and attribute names, namespaces, and both direct and template-content trees when cloning or importing nodes without recursive traversal.

- [#688](https://github.com/Shopify/remote-dom/pull/688) [`3c57e5b`](https://github.com/Shopify/remote-dom/commit/3c57e5b6202f0779eb7ee99ad3298f6d17032c51) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Fix `Node.contains()` for nested descendants and nodes outside the current subtree.

- [#667](https://github.com/Shopify/remote-dom/pull/667) [`cdfd5dd`](https://github.com/Shopify/remote-dom/commit/cdfd5dd2bc3fecbea7799d3921bb8d93bd6103dd) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Validate tree insertions and replacements before changing node links so invalid ancestor, template-content cycle, and reference-node mutations preserve the existing trees. Treat inserting a node before itself as a no-op and safely replace a child with its next sibling.

- [#687](https://github.com/Shopify/remote-dom/pull/687) [`db32f49`](https://github.com/Shopify/remote-dom/commit/db32f49fbbe0bdfd1e14450008b5b8634d2362d7) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Ignore unmatched closing tags, preserve SVG and HTML namespace boundaries, and retain literal parser names while parsing `innerHTML`.

## 1.5.1

### Patch Changes

- [#600](https://github.com/Shopify/remote-dom/pull/600) [`d9b4dab`](https://github.com/Shopify/remote-dom/commit/d9b4dab1ce2f76751fafab04e7a6ede8a3aa8045) Thanks [@henrytao-me](https://github.com/henrytao-me)! - Fix document fragment owner document

## 1.5.0

### Minor Changes

- [#593](https://github.com/Shopify/remote-dom/pull/593) [`61f5cba`](https://github.com/Shopify/remote-dom/commit/61f5cbaa9965f7befbea3d3dfc2d2b2a0798c958) Thanks [@developit](https://github.com/developit)! - Add support for `not` in query-selectors

## 1.4.7

### Patch Changes

- [#594](https://github.com/Shopify/remote-dom/pull/594) [`789a7c7`](https://github.com/Shopify/remote-dom/commit/789a7c7480a445d1e5973bd6e2aa4e8889ec6f85) Thanks [@robin-drexler](https://github.com/robin-drexler)! - add `FocusEvent`, `ClipboardEvent` and `ToggleEvent` to polyfill

## 1.4.6

### Patch Changes

- [#590](https://github.com/Shopify/remote-dom/pull/590) [`8994a49`](https://github.com/Shopify/remote-dom/commit/8994a49913cd0122fdfbd21f971448afab3a3207) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix error events not working

## 1.4.5

### Patch Changes

- [#571](https://github.com/Shopify/remote-dom/pull/571) [`0bba42b`](https://github.com/Shopify/remote-dom/commit/0bba42b3246fd100fce6cc03900f2b4645092264) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix Element.innerHTML not allowing newlines before attributes

## 1.4.4

### Patch Changes

- [#570](https://github.com/Shopify/remote-dom/pull/570) [`33baaba`](https://github.com/Shopify/remote-dom/commit/33baaba512ca461068f57dcba707ef1cc640bfca) Thanks [@robin-drexler](https://github.com/robin-drexler)! - fix event listener methods not being bound to correctly

## 1.4.3

### Patch Changes

- [#541](https://github.com/Shopify/remote-dom/pull/541) [`f42f535`](https://github.com/Shopify/remote-dom/commit/f42f535fb08ace5ba9a4332f39b49281fd0880f3) Thanks [@developit](https://github.com/developit)! - fix typo in previousElementSibling

## 1.4.2

### Patch Changes

- [#499](https://github.com/Shopify/remote-dom/pull/499) [`994e2ea`](https://github.com/Shopify/remote-dom/commit/994e2ea2f7ab0e67a2c37e5295ce86618b004518) Thanks [@lemonmade](https://github.com/lemonmade)! - Roll back mutation of `globalThis` and `globalThis.self` in `Window.setGlobal()`

  This prevents the polyfill from interfering with globals like `globalThis.addEventListener`, which you may need to manage the communication between a sandboxed environment and the main thread.

  In the future, we will likely change the polyfill to require you to explicitly install the polyfill, instead of it being done automatically when you `@remote-dom/core/polyfill`. At that point, we will reintroduce the ability to more faithfully replicate more DOM globals, like having `globalThis`, `globalThis.self`, and `globalThis.window` all refer to the same polyfilled `Window` object. To install this polyfill today and get back to the behavior introduced by [this PR](https://github.com/Shopify/remote-dom/pull/470), you can call the new `Window.setGlobalThis()` method:

  ```js
  import {window, Window} from '@remote-dom/core/polyfill';

  Window.setGlobalThis(window);
  ```

## 1.4.1

### Patch Changes

- [#472](https://github.com/Shopify/remote-dom/pull/472) [`1473a3c`](https://github.com/Shopify/remote-dom/commit/1473a3c521e8d4d44d50c2f15680f28997270dc8) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Fix removeChild so it clears parent/sibling references

- [#472](https://github.com/Shopify/remote-dom/pull/472) [`1473a3c`](https://github.com/Shopify/remote-dom/commit/1473a3c521e8d4d44d50c2f15680f28997270dc8) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Add node.parentElement

- [#470](https://github.com/Shopify/remote-dom/pull/470) [`08839d3`](https://github.com/Shopify/remote-dom/commit/08839d3c136b63024ef725d9cf427e250f2978d3) Thanks [@developit](https://github.com/developit)! - window aliases should refer to globalThis

## 1.4.0

### Minor Changes

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Implement node.isConnected

### Patch Changes

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Ensure that the insert and remove hooks are only called for element parents.

- [#446](https://github.com/Shopify/remote-dom/pull/446) [`b297fc5`](https://github.com/Shopify/remote-dom/commit/b297fc5efecc6479fa5e0e3bdcdb48dea721df43) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Make connectedCallback and disconnectedCallback call on connect/disconnect recursively

## 1.3.1

### Patch Changes

- [#436](https://github.com/Shopify/remote-dom/pull/436) [`5979797`](https://github.com/Shopify/remote-dom/commit/59797975a3ccf2bee825809f67e05ca4a28e2647) Thanks [@jakearchibald](https://github.com/jakearchibald)! - Ensure the `createText` hook is called when creating a new text node

## 1.3.0

### Minor Changes

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Added native support for synchronizing attributes and event listeners

  Previously, Remote DOM only offered “remote properties” as a way to synchronize element state between the host and remote environments. These remote properties effectively synchronize a subset of a custom element’s instance properties. The `RemoteElement` class offers [a declarative way to define the properties that should be synchronized](/packages/core/README.md#remote-properties).

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteProperties() {
      return ['label'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');
  myElement.label = 'Hello, World!';
  ```

  The same `remoteProperties` configuration can create special handling for attributes and event listeners. By default, a remote property is automatically updated when setting an [attribute](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) of the same name:

  ```ts
  const myElement = document.createElement('my-element');
  myElement.setAttribute('label', 'Hello, World!');

  // myElement.label === 'Hello, World!', and this value is synchronized
  // with the host environment as a “remote property”
  ```

  Similarly, a remote property can be automatically updated when adding an event listener based on a conventional `on` property naming prefix:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteProperties() {
      return {
        onChange: {
          event: true,
        },
      };
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  // This adds a callback property that is synchronized with the host environment
  myElement.onChange = () => console.log('Changed!');

  // And so does this, but using the `addEventListener` method instead
  myElement.addEventListener('change', () => console.log('Changed!'));
  ```

  These utilities are handy, but they don’t align with patterns in native DOM elements, particularly when it comes to events. Now, both of these can be represented in a fashion that is more conventional in HTML. The `remoteAttributes` configuration allows you to define a set of element attributes that will be synchronized directly the host environment, instead of being treated as instance properties:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteAttributes() {
      return ['label'];
    }

    // If you want to add instance properties, you can do it with getters and
    // setters that manipulate the attribute value:
    //
    // get label() {
    //   return this.getAttribute('label');
    // }
    //
    // set label(value) {
    //   this.setAttribute('label', value);
    // }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');
  myElement.setAttribute('label', 'Hello, World!');
  ```

  Similarly, the `remoteEvents` configuration allows you to define a set of event listeners that will be synchronized directly with the host environment:

  ```ts
  import {RemoteElement} from '@remote-dom/core/elements';

  class MyElement extends RemoteElement {
    static get remoteEvents() {
      return ['change'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  // And so does this, but using the `addEventListener` method instead
  myElement.addEventListener('change', () => console.log('Changed!'));

  // No `myElement.onChange` property is created
  ```

  The `remoteProperties` configuration will continue to be supported for cases where you want to synchronize instance properties. Because instance properties can be any JavaScript type, properties are the highest-fidelity field that can be synchronized between the remote and host environments. However, adding event listeners using the `remoteProperties.event` configuration is **deprecated and will be removed in the next major version**. You should use the `remoteEvents` configuration instead. If you were previously defining remote properties which only accepted strings, consider using the `remoteAttributes` configuration, which stores the value entirely in an HTML attribute instead.

  This change is being released in a backwards-compatible way, so you can continue to use the existing `remoteProperties` configuration on host and/or remote environments without any code changes.

  All host utilities have been updated to support the new `attributes` and `eventListeners` property that are synchronized with the remote environment. This includes updates to the [React](/packages/react/README.md#event-listener-props) and [Preact hosts to map events to conventional callback props](/packages/preact/README.md#event-listener-props), and updates to the [`DOMRemoteReceiver` class](/packages/core/README.md#domremotereceiver), which now applies fields to the host element exactly as they were applied in the remote environment:

  ```ts
  // Remote environment:

  class MyElement extends RemoteElement {
    static get remoteEvents() {
      return ['change'];
    }
  }

  customElements.define('my-element', MyElement);

  const myElement = document.createElement('my-element');

  myElement.addEventListener('change', (event) => {
    console.log('Changed! New value: ', event.detail);
  });

  // Host environment:

  class MyElement extends HTMLElement {
    connectedCallback() {
      // Emit a change event on this element, with detail that will be passed
      // to the remote environment
      this.addEventListener('change', (event) => {
        event.stopImmediatePropagation();

        this.dispatchEvent(
          new CustomEvent('change', {
            detail: this.value,
          }),
        );
      });
    }

    // Additional implementation details of the host custom element...
  }

  customElements.define('my-element', MyElement);
  ```

### Patch Changes

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Bug fixes to event dispatching

  - Listeners on the target are now called during both the capture and bubble phases.
  - `stopPropagation` now respected.
  - `stopImmediatePropagation` now also stops regular propagation.

- [#389](https://github.com/Shopify/remote-dom/pull/389) [`2479b21`](https://github.com/Shopify/remote-dom/commit/2479b21406f6149063bfc095dbb6c3a019386403) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `Event.bubbles` and `Event.composedPath()` implementations

## 1.2.1

### Patch Changes

- [#419](https://github.com/Shopify/remote-dom/pull/419) [`3c6bd29`](https://github.com/Shopify/remote-dom/commit/3c6bd291121b9fa02cac4ba57274601e97b2a2d2) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix synchronization of `slot` property in some edge cases

## 1.2.0

### Minor Changes

- [#411](https://github.com/Shopify/remote-dom/pull/411) [`3bec698`](https://github.com/Shopify/remote-dom/commit/3bec6983756c4b8a6834a037ac520438ef59d28f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add CommonJS export conditions

## 1.1.0

### Minor Changes

- [#402](https://github.com/Shopify/remote-dom/pull/402) [`218ba3b`](https://github.com/Shopify/remote-dom/commit/218ba3bf1ff2e7518a7dcec11ffd352de70b16f8) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Refactor hooks into the Window instance

## 1.0.6

### Patch Changes

- [#406](https://github.com/Shopify/remote-dom/pull/406) [`2ea3459`](https://github.com/Shopify/remote-dom/commit/2ea3459e29afc1421b3283ad59514fed38a52515) Thanks [@developit](https://github.com/developit)! - Fixes `hooks.addEventListener()` being called even when `EventTarget.addEventListener()` rejects a duplicate listener registration

## 1.0.5

### Patch Changes

- [#401](https://github.com/Shopify/remote-dom/pull/401) [`578a8c6`](https://github.com/Shopify/remote-dom/commit/578a8c69ed1df63da77ab5a0efd0b28f8a0188d9) Thanks [@olavoasantos](https://github.com/olavoasantos)! - Expose documentElement, head and body elements on the Document polyfill

## 1.0.4

### Patch Changes

- [`72304d6`](https://github.com/Shopify/remote-dom/commit/72304d6a76d28712c62698803d6ec65d9ac29614) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `Node.contains()` method used by React

- [`e6deda6`](https://github.com/Shopify/remote-dom/commit/e6deda6b90c4c6cff94cac60619a7ef1deb7524e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add missing `CustomElementRegistry.getName()` function

## 1.0.3

### Patch Changes

- [`549a423`](https://github.com/Shopify/remote-dom/commit/549a423b31d89354fa8ef91e8533eff69953d695) Thanks [@lemonmade](https://github.com/lemonmade)! - Consult custom elements in `createElementNS`

- [`31f8720`](https://github.com/Shopify/remote-dom/commit/31f8720e916ce8ac69bc079ba8e2aac089313605) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `createElementNS` argument ordering

## 1.0.2

### Patch Changes

- [`7d5327c`](https://github.com/Shopify/remote-dom/commit/7d5327ca3fd02f625bb404d43d9b0f7c9a3b079d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix making `window` non-configurable in polyfill

## 1.0.1

### Patch Changes

- [#281](https://github.com/Shopify/remote-dom/pull/281) [`0c51bbc`](https://github.com/Shopify/remote-dom/commit/0c51bbc2c7419ce23e1b8d02d4a0323c5b180672) Thanks [@santala](https://github.com/santala)! - Fix missing createElement hook call

- [#281](https://github.com/Shopify/remote-dom/pull/281) [`6768867`](https://github.com/Shopify/remote-dom/commit/6768867ac4f24059c30daeaf9d6dc1f4809b0155) Thanks [@santala](https://github.com/santala)! - Fix Node.textContent incorrectly appending the textContent of subsequent siblings

## 1.0.0

### Major Changes

- [`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf) Thanks [@lemonmade](https://github.com/lemonmade)! - First release of Remote DOM. Read more about this [refactor of remote-ui on native DOM APIs](https://github.com/Shopify/remote-dom/discussions/267), and take a look at the [updated documentation](/README.md).

## 0.1.0

### Minor Changes

- [`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82) Thanks [@lemonmade](https://github.com/lemonmade)! - Test minor bump

## 0.0.2

### Patch Changes

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a) Thanks [@lemonmade](https://github.com/lemonmade)! - Test version bump

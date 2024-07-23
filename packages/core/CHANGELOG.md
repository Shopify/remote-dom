# @remote-dom/core

## 1.2.0

### Minor Changes

- [`040e7c5`](https://github.com/Shopify/remote-dom/commit/040e7c5dde658596ccbf883e2d3810955790eff0) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `cache` option to `DOMRemoteReceiver` to preserve host elements

- [`894d6f3`](https://github.com/Shopify/remote-dom/commit/894d6f3396ebb2e1de7e91b1a445aa0a39195bb9) Thanks [@lemonmade](https://github.com/lemonmade)! - Return `DocumentFragment` from `DOMRemoteReceiver.disconnect()`

## 1.1.0

### Minor Changes

- [#394](https://github.com/Shopify/remote-dom/pull/394) [`22e6512`](https://github.com/Shopify/remote-dom/commit/22e6512f797d97d2106f181d730d995f37c6edaf) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `BatchingRemoteConnection` helper for batching changes to a polyfilled DOM

## 1.0.1

### Patch Changes

- [`ee5e843`](https://github.com/Shopify/remote-dom/commit/ee5e843a85c1d213420ae25cb2fc248484ca04f3) Thanks [@lemonmade](https://github.com/lemonmade)! - Force upgrade polyfill dependency to fix `createElementNS` errors

## 1.0.0

### Major Changes

- [`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf) Thanks [@lemonmade](https://github.com/lemonmade)! - First release of Remote DOM. Read more about this [refactor of remote-ui on native DOM APIs](https://github.com/Shopify/remote-dom/discussions/267), and take a look at the [updated documentation](/README.md).

### Patch Changes

- Updated dependencies [[`37be652`](https://github.com/Shopify/remote-dom/commit/37be652f288d1eec170c0be13b2da516f8db5dcf)]:
  - @remote-dom/polyfill@1.0.0

## 0.1.1

### Patch Changes

- [#268](https://github.com/Shopify/remote-dom/pull/268) [`9576a72`](https://github.com/Shopify/remote-dom/commit/9576a72fa354481621c53efde4169829fe9bfabf) Thanks [@shopify-github-actions-access](https://github.com/apps/shopify-github-actions-access)! - Send initial tree of UI elements when connecting a `RemoteRootElement`

## 0.1.0

### Minor Changes

- [`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82) Thanks [@lemonmade](https://github.com/lemonmade)! - Test minor bump

### Patch Changes

- Updated dependencies [[`7061ded`](https://github.com/Shopify/remote-dom/commit/7061ded1da4699c6dd6a820eeb940a8af7c66d82)]:
  - @remote-dom/polyfill@0.1.0

## 0.0.2

### Patch Changes

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a) Thanks [@lemonmade](https://github.com/lemonmade)! - Test version bump

- [#251](https://github.com/Shopify/remote-dom/pull/251) [`8e1fad4`](https://github.com/Shopify/remote-dom/commit/8e1fad4a00cfe68ff1594fbabeec10c29958685f) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `root` option to `DOMRemoteReceiver`

- Updated dependencies [[`5939cca`](https://github.com/Shopify/remote-dom/commit/5939cca8112417124327bd26f9e2c21f4bf9b20a)]:
  - @remote-dom/polyfill@0.0.2

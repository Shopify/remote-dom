# @remote-dom/polyfill

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

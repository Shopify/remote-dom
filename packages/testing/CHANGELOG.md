# Changelog

## 1.4.1

### Patch Changes

- [#223](https://github.com/Shopify/remote-ui/pull/223) [`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix TypeScript types for exports consumers

- Updated dependencies [[`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e)]:
  - @remote-ui/core@2.2.2

## 1.4.0

### Minor Changes

- [#197](https://github.com/Shopify/remote-ui/pull/197) [`e15d142`](https://github.com/Shopify/remote-ui/commit/e15d1423f3759bdf9368d1fe3964347fd8a0c301) Thanks [@lemonmade](https://github.com/lemonmade)! - Added a number of methods that align more closely with the corresponding DOM API, and deprecated a few existing methods with overlapping functionality:

  - `RemoteParent.appendChild` is deprecated, with a new `RemoteParent.append` API recommended instead. This new API matches the [`Element.append`](https://developer.mozilla.org/en-US/docs/Web/API/Element/append) DOM API: it allows you to pass multiple children, including strings that are converted to text nodes.
  - `RemoteParent.insertChildBefore` is deprecated, with a new `RemoteParent.insertBefore` API recommended instead. This matches the [`Node.insertBefore`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) DOM API, including the fact that the second argument can be null (in which case, the method behaves the same as `append`
  - `RemoteParent.replaceChildren` is new, and matches the [`Element.replaceChildren`](https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren) DOM API. It allows passing any number of children/ strings, and those are used to fully replace the existing children.
  - `RemoteComponent.remove` and `RemoteText.remove` are new, and match the [`Element.remove`](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove) DOM API.
  - `RemoteText.updateText` is deprecated in favor of a new `RemoteText.update` method, which is a little shorter.

### Patch Changes

- Updated dependencies [[`e15d142`](https://github.com/Shopify/remote-ui/commit/e15d1423f3759bdf9368d1fe3964347fd8a0c301)]:
  - @remote-ui/core@2.2.0

## [1.3.16]

### Fixed

- Fixed an issue where a test root’s `debug()` method would incorrectly include DOM attributes ([pull request](https://github.com/Shopify/remote-ui/pull/169), thanks [@jackokerman-stripe](https://github.com/jackokerman-stripe)!)

## [1.0.3] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

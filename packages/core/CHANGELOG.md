# Changelog

## 2.2.7

### Patch Changes

- Updated dependencies [[`ec8cbe8`](https://github.com/Shopify/remote-dom/commit/ec8cbe8c61d15a494ccd60b4b0515e201a132dae)]:
  - @remote-ui/rpc@1.4.7

## 2.2.6

### Patch Changes

- Updated dependencies [[`4d7da5f`](https://github.com/Shopify/remote-dom/commit/4d7da5f47f9a8c5c6340cc6726c8403475d599b2)]:
  - @remote-ui/rpc@1.4.6

## 2.2.5

### Patch Changes

- [#522](https://github.com/Shopify/remote-dom/pull/522) [`0ade5f7`](https://github.com/Shopify/remote-dom/commit/0ade5f74ad96bdb2b8513b2b18c0b9298717e672) Thanks [@thomas-marcucci](https://github.com/thomas-marcucci)! - Fixes an issue when removeChild does not find a child node

## 2.2.4

### Patch Changes

- [#257](https://github.com/Shopify/remote-ui/pull/257) [`2873c5e`](https://github.com/Shopify/remote-ui/commit/2873c5efc1f885e5cc906fa07cb11bcc2753c1d7) Thanks [@robin-drexler](https://github.com/robin-drexler)! - bump rpc dep versions

## 2.2.3

### Patch Changes

- [#226](https://github.com/Shopify/remote-ui/pull/226) [`d0ef4fb`](https://github.com/Shopify/remote-ui/commit/d0ef4fb14f0c5c835bd8b36a0b63a30bd2f73f67) Thanks [@alexandcote](https://github.com/alexandcote)! - Re-exposing types definitions in @remote-ui/core

## 2.2.2

### Patch Changes

- [#223](https://github.com/Shopify/remote-ui/pull/223) [`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix TypeScript types for exports consumers

- Updated dependencies [[`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e)]:
  - @remote-ui/rpc@1.4.3
  - @remote-ui/types@1.1.3

## 2.2.1

### Patch Changes

- [#187](https://github.com/Shopify/remote-ui/pull/187) [`d8e7bae`](https://github.com/Shopify/remote-ui/commit/d8e7baed50d5743a55f86b88005f411fba0c7cd5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix infinite loops with self-referencing structures

- Updated dependencies [[`d8e7bae`](https://github.com/Shopify/remote-ui/commit/d8e7baed50d5743a55f86b88005f411fba0c7cd5)]:
  - @remote-ui/rpc@1.4.1

## 2.2.0

### Minor Changes

- [#197](https://github.com/Shopify/remote-ui/pull/197) [`e15d142`](https://github.com/Shopify/remote-ui/commit/e15d1423f3759bdf9368d1fe3964347fd8a0c301) Thanks [@lemonmade](https://github.com/lemonmade)! - Added a number of methods that align more closely with the corresponding DOM API, and deprecated a few existing methods with overlapping functionality:

  - `RemoteParent.appendChild` is deprecated, with a new `RemoteParent.append` API recommended instead. This new API matches the [`Element.append`](https://developer.mozilla.org/en-US/docs/Web/API/Element/append) DOM API: it allows you to pass multiple children, including strings that are converted to text nodes.
  - `RemoteParent.insertChildBefore` is deprecated, with a new `RemoteParent.insertBefore` API recommended instead. This matches the [`Node.insertBefore`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) DOM API, including the fact that the second argument can be null (in which case, the method behaves the same as `append`
  - `RemoteParent.replaceChildren` is new, and matches the [`Element.replaceChildren`](https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren) DOM API. It allows passing any number of children/ strings, and those are used to fully replace the existing children.
  - `RemoteComponent.remove` and `RemoteText.remove` are new, and match the [`Element.remove`](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove) DOM API.
  - `RemoteText.updateText` is deprecated in favor of a new `RemoteText.update` method, which is a little shorter.

### Patch Changes

- Updated dependencies [[`e15d142`](https://github.com/Shopify/remote-ui/commit/e15d1423f3759bdf9368d1fe3964347fd8a0c301)]:
  - @remote-ui/rpc@1.4.0

## [2.1.14] - 2021-07-14

- Fixed a crash when mutating the children of a fragment ([pull request](https://github.com/Shopify/remote-ui/pull/170))

## [2.1.13] - 2021-07-12

- Fixed a nested node prop rendering bug in the receiver ([pull request](https://github.com/Shopify/remote-ui/pull/168))

## [2.1.12] - 2021-06-15

- Fixed a rendering order issue with inserting child in remote components ([pull request](https://github.com/Shopify/remote-ui/pull/165))

## [2.1.11] - 2021-06-13

- Fixed more issues with re-ordering children in remote components ([pull request](https://github.com/Shopify/remote-ui/pull/161))

## [2.1.10] - 2021-06-07

- Fixed an issue where children were not removed from an existing parent before being appended to a new one ([pull request](https://github.com/Shopify/remote-ui/pull/160))

## [2.1.9] - 2021-04-06

- Fixed an issue where the host representation of a remote root did not have a `kind` field ([pull request](https://github.com/Shopify/remote-ui/pull/150))

## [2.1.0] - 2021-05-31

- Add `RemoteFragment` to support component props as sub tree ([39be759](https://github.com/Shopify/remote-ui/commit/39be75999895aeee418c1ddced71819ad544c967)).

## [2.0.1] - 2020-03-10

- Fixed an issue where `RemoteReceiver#state` would not update correctly ([pull request](https://github.com/Shopify/remote-ui/pull/68)).

## [2.0.0] - 2020-02-13

- **Breaking:** changed `RemoteReceiver` to only be a type, and now export `createRemoteReceiver` for creating these objects. The new `RemoteReceiver` supports listening for mounting events ([pull request](https://github.com/Shopify/remote-ui/pull/66)).

## [1.6.0] - 2020-12-04

- `RemoteReceiver` now has a `flush` method that returns a promise for a time after all in-progress updates are finished ([pull request](https://github.com/Shopify/remote-ui/pull/47)).
- `RemoteRoot` now has an `options` field that allows a user of the root to determine whether it was constructed in strict mode, and what components are available for rendering ([pull request](https://github.com/Shopify/remote-ui/pull/47)).
- The serialization of components and text now includes a `kind` key that uses the same `KIND_REMOTE_TEXT` or `KIND_REMOTE_COMPONENT` constants as the original object ([pull request](https://github.com/Shopify/remote-ui/pull/47)).

## [1.5.0] - 2020-10-26

- `RemoteComponent#updateProps()` now performs a “hot swap” on any prop that is a function (including functions nested in objects or arrays) in order to prevent timing differences from causing the host to call a function prop that has already changed reference in the remote context ([pull request](https://github.com/Shopify/remote-ui/pull/32))

## [1.4.0] - 2020-10-01

- Added a `kind` field to `RemoteRoot` to distinguish it from other remote nodes (its value is always the newly-exported `KIND_REMOTE_ROOT` constant) ([pull request](https://github.com/Shopify/remote-ui/pull/23)).

## [1.3.0] - 2020-08-31

- `RemoteRoot#createComponent()` now checks whether the passed component is supported if the `components` option was provided `createRemoteRoot()` ([pull request](https://github.com/Shopify/remote-ui/pull/20)).
- Only nodes created by `RemoteRoot#createComponent()` or `RemoteRoot#createText()` can be added to a tree of remote components ([pull request](https://github.com/Shopify/remote-ui/pull/20)).

## [1.2.2] - 2020-06-25

- Fixed the type of `RemoteReceiver#get()` to correctly indicate that an attached element may be `null` ([pull request](https://github.com/Shopify/remote-ui/pull/17)).

## [1.2.1] - 2020-06-25

- Fixed an error that prevented strings from being passed in the array of children for `RemoteRoot#createComponent()`.

## [1.2.0] - 2020-06-25

### Added

- `RemoteRoot#createComponent()` now accepts an array of children as the third argument, which allows you to more seamlessly construct a large tree of nodes.

## [1.1.1] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.1.0] - 2020-06.24

### Added

- Added a `strict` option to control immutability in `@remote-ui/core`’s `createRemoteRoot()` ([pull request](https://github.com/Shopify/remote-ui/pull/16)).

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

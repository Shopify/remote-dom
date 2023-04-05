# Changelog

## 1.4.3

### Patch Changes

- [#223](https://github.com/Shopify/remote-ui/pull/223) [`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix TypeScript types for exports consumers

## 1.4.2

### Patch Changes

- [#215](https://github.com/Shopify/remote-ui/pull/215) [`981d67c`](https://github.com/Shopify/remote-ui/commit/981d67c60754dc6e9f5dbee5794dffcaeb902261) Thanks [@robin-drexler](https://github.com/robin-drexler)! - Ensures iframe connection can always be established

## 1.4.1

### Patch Changes

- [#187](https://github.com/Shopify/remote-ui/pull/187) [`d8e7bae`](https://github.com/Shopify/remote-ui/commit/d8e7baed50d5743a55f86b88005f411fba0c7cd5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix infinite loops with self-referencing structures

## 1.4.0

### Minor Changes

- [#197](https://github.com/Shopify/remote-ui/pull/197) [`e15d142`](https://github.com/Shopify/remote-ui/commit/e15d1423f3759bdf9368d1fe3964347fd8a0c301) Thanks [@lemonmade](https://github.com/lemonmade)! - Added a number of methods that align more closely with the corresponding DOM API, and deprecated a few existing methods with overlapping functionality:

  - `RemoteParent.appendChild` is deprecated, with a new `RemoteParent.append` API recommended instead. This new API matches the [`Element.append`](https://developer.mozilla.org/en-US/docs/Web/API/Element/append) DOM API: it allows you to pass multiple children, including strings that are converted to text nodes.
  - `RemoteParent.insertChildBefore` is deprecated, with a new `RemoteParent.insertBefore` API recommended instead. This matches the [`Node.insertBefore`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) DOM API, including the fact that the second argument can be null (in which case, the method behaves the same as `append`
  - `RemoteParent.replaceChildren` is new, and matches the [`Element.replaceChildren`](https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren) DOM API. It allows passing any number of children/ strings, and those are used to fully replace the existing children.
  - `RemoteComponent.remove` and `RemoteText.remove` are new, and match the [`Element.remove`](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove) DOM API.
  - `RemoteText.updateText` is deprecated in favor of a new `RemoteText.update` method, which is a little shorter.

## 1.3.5

### Patch Changes

- [#192](https://github.com/Shopify/remote-ui/pull/192) [`fb2e2e8`](https://github.com/Shopify/remote-ui/commit/fb2e2e8b76876158a6dab1aee2a9915d5a182a20) Thanks [@TheCloudlessSky](https://github.com/TheCloudlessSky)! - Fix memory leak when listening to 'message' events from child iframes

## [1.3.3] - 2022-08-15

- Errors in exposed methods are now rethrown where they occur ([pull request](https://github.com/Shopify/remote-ui/pull/173)).

## [1.3.1] - 2022-03-10

- Fixed an issue where `postMessage` were sent even if the communication channel was `terminated` ([pull request](https://github.com/Shopify/remote-ui/pull/163)).

## [1.3.0] - 2022-03-10

- Allow `ArrayBuffer` to be sent over the rpc layer ([pull request](https://github.com/Shopify/remote-ui/pull/147)).

## [1.2.6] - 2022-01-25

- Stopped throwing an error in some `postMessage` event handlers, which prevents unhandled promise rejection listeners from running unnecessarily.

## [1.2.3] - 2021-07-15

- Fixed an error thrown by the `fromIframe` and `fromInsideIframe` helpers when used on cross-origin iframes ([pull request](https://github.com/Shopify/remote-ui/pull/110)).

## [1.2.2] - 2021-06-21

- Fixed error handling in RPC layer by rethrowing exceptions ([pull request](https://github.com/Shopify/remote-ui/pull/103)).

## [1.2.1] - 2021-06-09

- Fixed an issue where `fromIframe` and `fromInsideIframe` were checking `event.target` instead of `event.source` to ensure messages were coming from the other endpoint.

## [1.2.0] - 2021-06-08

- Adds additional adaptors for converting `iframe` elements into `Endpoint` objects [[#97](https://github.com/Shopify/remote-ui/pull/97)]

## [1.0.2] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

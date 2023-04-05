# Changelog

## 5.0.2

### Patch Changes

- [#223](https://github.com/Shopify/remote-ui/pull/223) [`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix TypeScript types for exports consumers

- Updated dependencies [[`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e)]:
  - @remote-ui/async-subscription@2.1.14
  - @remote-ui/core@2.2.2
  - @remote-ui/rpc@1.4.3

## 5.0.1

### Patch Changes

- [#206](https://github.com/Shopify/remote-ui/pull/206) [`6f1ceef`](https://github.com/Shopify/remote-ui/commit/6f1ceef342c0d91e9736bfca8e7f8845f4ffd0f3) Thanks [@banderson](https://github.com/banderson)! - Added missing `detachDeletedInstance` function to `@remote-ui/react/reconciler`. This function is invoked during React's clean up phase, so prior to this change you'd get an exception / broken app when a component is removed from the tree.

## 5.0.0

### Major Changes

- [#191](https://github.com/Shopify/remote-ui/pull/191) [`77ba3da`](https://github.com/Shopify/remote-ui/commit/77ba3da217cb0e443e674afc058916ca25f5900e) Thanks [@lemonmade](https://github.com/lemonmade)! - Added support for React 18 by having the consumer own the versions of `react` and `react-reconciler`. If you are currently using React 17 only, and are rendering in the “remote” context, you will need to add a dependency on `react-reconciler^0.27.0`. If you are using React 18, you will need to manually install the version of `react-reconciler` that matches up to that version (currently, `^0.29.0`).

- [#191](https://github.com/Shopify/remote-ui/pull/191) [`77ba3da`](https://github.com/Shopify/remote-ui/commit/77ba3da217cb0e443e674afc058916ca25f5900e) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed re-export of `@remote-ui/rpc`. If you need `retain` or `release`, import them directly from `@remote-ui/rpc` instead.

### Patch Changes

- Added missing `detachDeletedInstance` function to `@remote-ui/react/reconciler`. This function is invoked during React's clean up phase, so prior to this change you'd get an exception / broken app when a component is removed from the tree.

## 4.6.0

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
  - @remote-ui/rpc@1.4.0

### Deprecated

- The `render` function is deprecated. Please move to using the new `createRoot` instead, which matches the API provided by React.

## [4.5.1] - 2022-05-16

- Fixed a missing `useAttached()` export in the `@shopify/remote-ui/host` entrypoint.

## [4.5.0]

- Added a `parent` property to the `ControllerOptions#renderComponent()` method, which allows you to customize the host rendering of a component based on where it is in the UI component tree ([pull request](https://github.com/Shopify/remote-ui/pull/150))

## [4.4.5]

- Pinned `react-reconciler` to `0.26.x` to prevent breaking React 17 projects ([pull request](https://github.com/Shopify/remote-ui/pull/151), thanks [@ericfrank-stripe](https://github.com/ericfrank-stripe)!)

## [4.4.3]

- Removed some unused hooks and context ([pull request](https://github.com/Shopify/remote-ui/pull/145))

## [4.4.2]

- Fixed rendering a single child inside a component that takes `fragmentProps` ([pull request](https://github.com/Shopify/remote-ui/pull/138)).

## [4.4.0] - 2022-01-13

- Calling `render()` multiple times with the same `RemoteRoot` now updates the root React element being rendered to the `RemoteRoot` ([pull request](https://github.com/Shopify/remote-ui/pull/134)).

## [4.3.0] - 2021-11-08

### Breaking Change

- The `useWorker()` export was removed from `@remote-ui/react/host`. If you want the same API, you can use [`@shopify/react-web-worker`](https://github.com/Shopify/quilt/tree/main/packages/react-web-worker) instead. This change was made as a result of [deprecating `@remote-ui/web-workers`](../web-workers).

## [4.2.2] - 2021-10-15

- Prevented `children` from being rendered unnecessarily in React when a remote node does not have any children ([pull request](https://github.com/Shopify/remote-ui/pull/129))

## [4.2.0] - 2021-07-19

- Add component and text renderer to controller ([pull request](https://github.com/Shopify/remote-ui/pull/86))

## [4.1.5] - 2021-06-29

- Fix types dependency ([pull request](https://github.com/Shopify/remote-ui/pull/108)).

## [4.1.4] - 2021-06-28

- Fix worker webpack build ([pull request](https://github.com/Shopify/remote-ui/pull/105)).

## [4.1.0] - 2021-05-31

- Add `RemoteFragment` to support component props as sub tree ([39be759](https://github.com/Shopify/remote-ui/commit/39be75999895aeee418c1ddced71819ad544c967)).

## [4.0.0] - 2020-02-13

- **Breaking:** now uses the `jsx-runtime` transform, and therefore requires React `^17.0.0` ([pull request](https://github.com/Shopify/remote-ui/pull/65)).
- **Breaking:** updated the dependency on `@remote-ui/core` to `2.0.0`.

## [3.0.0] - 2020-12-04

- **Breaking:** the `RemoteRenderer` component no longer accepts a `components` mapping directly ([pull request](https://github.com/Shopify/remote-ui/pull/48)). Instead, it accepts a `controller` prop, which you must construct with your component mapping using the new `createController` function. If you are only using the remote React utilities (e.g., you were not importing from `@remote-ui/react/host`), this change does not affect you.
- Loosened the version constraints on React and `react-reconciler` to allow the usage of React 17.x ([pull request](https://github.com/Shopify/remote-ui/pull/23)).

## [2.0.0] - 2020-10-01

- **Breaking:** calling `render()` will no longer call `RemoteRoot#mount()` after the initial reconciliation ([pull request](https://github.com/Shopify/remote-ui/pull/23)). To reproduce the old behavior, you can use the new third argument to `render()`, a callback that is executed after the initial reconciliation:

  ```ts
  import {createRemoteRoot} from '@remote-ui/core';
  import {render} from '@remote-ui/react';

  const root = createRemoteRoot(() => {});

  render(<App />, root, () => {
    root.mount();
  });
  ```

## [1.0.6] - 2020-06-25

- Fixed an issue where the `RemoteRenderer` component would throw an error if a remote component was removed from the tree while its host representation was in the process of mounting.

## [1.0.3] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

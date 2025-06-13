# Changelog

## 2.1.18

### Patch Changes

- Updated dependencies [[`ec8cbe8`](https://github.com/Shopify/remote-dom/commit/ec8cbe8c61d15a494ccd60b4b0515e201a132dae)]:
  - @remote-ui/rpc@1.4.7

## 2.1.17

### Patch Changes

- Updated dependencies [[`4d7da5f`](https://github.com/Shopify/remote-dom/commit/4d7da5f47f9a8c5c6340cc6726c8403475d599b2)]:
  - @remote-ui/rpc@1.4.6

## 2.1.16

### Patch Changes

- [#531](https://github.com/Shopify/remote-dom/pull/531) [`5e74921`](https://github.com/Shopify/remote-dom/commit/5e749216119e566444774b7353c683ee9593c707) Thanks [@robin-drexler](https://github.com/robin-drexler)! - return subscriber result e.g. to catch errors

  ```js
  function createRemoteSubscribableWrapper(subscription) {
    return createRemoteSubscribable({
      current: subscription.current,
      subscribe: (subscriber) => {
        return subscription.subscribe(async (value) => {
          try {
            await subscriber(value);
          } catch {
            // Catch errors and do something with them
          }
        });
      },
    });
  }
  ```

## 2.1.15

### Patch Changes

- [#257](https://github.com/Shopify/remote-ui/pull/257) [`2873c5e`](https://github.com/Shopify/remote-ui/commit/2873c5efc1f885e5cc906fa07cb11bcc2753c1d7) Thanks [@robin-drexler](https://github.com/robin-drexler)! - bump rpc dep versions

## 2.1.14

### Patch Changes

- [#223](https://github.com/Shopify/remote-ui/pull/223) [`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix TypeScript types for exports consumers

- Updated dependencies [[`6c7f5f4`](https://github.com/Shopify/remote-ui/commit/6c7f5f44314447a436c8277f2d23e5ba82fb5c3e)]:
  - @remote-ui/rpc@1.4.3

## [2.1.6] - 2021-10-15

- Fixed a potential timing issue when using the `makeStatefulSubscribable()` function ([pull request](https://github.com/Shopify/remote-ui/pull/128))

## [2.0.0] - 2021-02-08

### Changed

- **Breaking:** changed all type and function names to be more accurate and to decouple the library from React.

## [1.0.2] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

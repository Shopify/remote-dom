# @remote-dom/compat

## 1.0.2

### Patch Changes

- [#547](https://github.com/Shopify/remote-dom/pull/547) [`ca6a668`](https://github.com/Shopify/remote-dom/commit/ca6a66893f02eb4e7881a7117de5a461c7ae3708) Thanks [@igor10k](https://github.com/igor10k)! - Handle reordering in adapter

- [#545](https://github.com/Shopify/remote-dom/pull/545) [`fe94f9b`](https://github.com/Shopify/remote-dom/commit/fe94f9b6e7087e1146fa2301b3d339c760c9d9a9) Thanks [@igor10k](https://github.com/igor10k)! - Handle fragments in adapter

## 1.0.1

### Patch Changes

- [#536](https://github.com/Shopify/remote-dom/pull/536) [`9abf5be`](https://github.com/Shopify/remote-dom/commit/9abf5bee323dfa522f9061ba61ce2f433a36cb4e) Thanks [@igor10k](https://github.com/igor10k)! - Use the same core dependency version for all packages

## 1.0.0

### Major Changes

- [#511](https://github.com/Shopify/remote-dom/pull/511) [`1a42bf6`](https://github.com/Shopify/remote-dom/commit/1a42bf6d72a1dcfe5403c097dfd406b116a3455b) Thanks [@robin-drexler](https://github.com/robin-drexler)! - Add a `adaptToLegacyRemoteChannel` helper that adapts a Remote DOM `RemoteConnection` object into a `remote-ui` `RemoteChannel`.

  It allows to use a Remote DOM receiver class on the host, even if the remote environment is using `remote-ui`.

### Patch Changes

- Updated dependencies [[`8cbf2c2`](https://github.com/Shopify/remote-dom/commit/8cbf2c2a6130dd0a19088a2adf18b506f468be8b)]:
  - @remote-dom/core@1.6.0

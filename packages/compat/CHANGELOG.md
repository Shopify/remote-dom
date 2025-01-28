# @remote-dom/compat

## 1.0.0

### Major Changes

- [#511](https://github.com/Shopify/remote-dom/pull/511) [`1a42bf6`](https://github.com/Shopify/remote-dom/commit/1a42bf6d72a1dcfe5403c097dfd406b116a3455b) Thanks [@robin-drexler](https://github.com/robin-drexler)! - Add a `adaptToLegacyRemoteChannel` helper that adapts a Remote DOM `RemoteConnection` object into a `remote-ui` `RemoteChannel`.

  It allows to use a Remote DOM receiver class on the host, even if the remote environment is using `remote-ui`.

### Patch Changes

- Updated dependencies [[`8cbf2c2`](https://github.com/Shopify/remote-dom/commit/8cbf2c2a6130dd0a19088a2adf18b506f468be8b)]:
  - @remote-dom/core@1.6.0

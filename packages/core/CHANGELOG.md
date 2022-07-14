# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

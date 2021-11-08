# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0]

### Breaking Change

This package has been deprecated. If you are looking for an ergonomic way to create web workers in a project using [`@remote-ui/rpc`](../rpc), Webpack, and Babel, we recommend you use [`@shopify/web-worker`](https://github.com/Shopify/quilt/tree/main/packages/web-worker), which has the same API as version `1.3.0` of this library.

## [1.3.0] - 2020-01-19

### Added

- Allowed custom filename in WebWorkerPlugin when generating worker file.

## [1.0.2] - 2020-06-24

### Fixed

- Added entry point information to `package.json`.

## [1.0.1] - 2020-06-23

### Fixed

- Fixed a build issue that caused errors when using a number of packages in projects that do not have `core-js@3.x` installed.

## [1.0.0] - 2020-06-23

Initial release.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

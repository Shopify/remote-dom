# Contributing

## [Code of conduct](./CODE_OF_CONDUCT.md).

All contributors **must** adhere to the code of conduct. Read the [full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Ways to contribute

There are many ways to contribute to Remote DOM:

- Filing bug reports or requesting new features by [opening an issue](https://github.com/Shopify/remote-dom/issues/new)
- Hacking on an issue from our [backlog](https://github.com/Shopify/remote-dom/issues)
- Improving tests, documentation, or examples

## Development

### Getting started

Clone this repository, use the Node.js version in [`.nvmrc`](./.nvmrc), and run `pnpm install`. The repository pins its pnpm version in [`package.json`](./package.json) and is entirely written in [TypeScript](https://www.typescriptlang.org).

#### Type check

Run `pnpm type-check`, which will run TypeScript’s `tsc` command on the repo.

This repo uses [project references](https://www.typescriptlang.org/docs/handbook/project-references.html), with each package represented as a project, as well as one project for all the non-source code files (tests, config, etc). Make sure you understand how to configure the `tsconfig.json` of projects, like setting the `references` key to include the path to any other packages whose types a given project depends on.

#### Lint

Run `pnpm lint`, which will run the entire codebase through [Prettier](https://prettier.io).

#### Test

Run `pnpm test` to run all tests with [Vitest](https://vitest.dev/guide/). Vitest watches for changes in an interactive development terminal and runs once in CI or other non-interactive environments. Run `pnpm test --coverage` to generate an HTML coverage report in `coverage/` and enforce the package coverage thresholds used in CI.

Tests are currently a little sparse, focused mostly on ensuring good end-to-end behavior when using all the libraries together. Additional tests can be added for public APIs in each package by including files with a `.test.ts` or `.test.tsx` extension. Follow the structure of the existing tests.

#### Build

To build all the package outputs for the repo, run `pnpm build`. This command uses [Rollup](https://rollupjs.org/), with a good set of configuration options provided by [Quilt](https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/builds.md). Some of these versions, like the `.esnext` version of the project you will see, preserve most of the original source code, so that build tools can be configured to parse, process, polyfill, and minify this code in the same way the rest of an application’s codebase. This helps to significantly reduce the bundle size of these packages.

`pnpm build` runs in CI and before publication. Generated outputs are ignored by Git, but you should run the command locally before submitting changes that affect package output.

#### Check browser bundle size

Run `pnpm size` to build the packages and check the aggregate Brotli size of each public package. These package-level guardrails include regular dependencies and exclude the React, Preact, and Preact Signals peer dependencies a consuming application provides.

Run `pnpm size:why` to build the packages and generate esbuild visualizations in `packages/size-limit/reports` when investigating growth. Measurements use a fixed ES2020 browser target so they remain comparable as the repository’s Browserslist query changes.

When adding a public package subpath, add its import to the matching fixture in [`packages/size-limit/fixtures`](./packages/size-limit/fixtures). Normal changes should consume the existing budget headroom. Increase a limit only when reviewed, intentional package growth exceeds it, and explain the reason in the pull request.

These limits measure package-level browser bundle guardrails. They do not represent npm tarball size or the exact bundle size of a specific application.

### GitHub Actions

Pin external actions to full 40-character commit SHAs with version comments. Adopt stable releases only after seven days and review their migration notes; Dependabot checks weekly with the same cooldown. Keep jobs on `ubuntu-latest`. Validate affected workflow paths without production credentials.

### Contributing a change

If this is your first contribution to a project on GitHub, you may find this [free video series on contributing to open source useful](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

If you are fixing a minor issue, feel free to send a pull request directly. If you are working on a non-trivial bug or feature, though, we’d appreciate if you could first [open an issue](https://github.com/Shopify/remote-dom/issues) so we can make sure the process goes smoothly. If you are taking on an issue, please leave a comment stating that you intend to work on it.

**Before submitting a pull request**, please:

1. Fork the repository and create your branch from `main`.
1. Run `pnpm install` from the repository root.
1. Run `pnpm lint`, `pnpm type-check`, `pnpm build`, and `pnpm test`. These commands also run in [GitHub Actions CI](./.github/workflows/ci.yml).
1. When changing examples or browser behavior, run `pnpm exec playwright install chromium` once and then `pnpm exec playwright test`.
1. Add a [changeset](#releasing-changes) for user-facing public-package changes. Configuration, documentation, examples, and tests generally do not require one.
1. If you haven’t already, [sign a Contributor License Agreement](https://cla.shopify.com/).

#### Contributor License Agreement (CLA)

Each contributor is required to [sign a CLA](https://cla.shopify.com/). This process is automated as part of your first pull request and is only required once. If any contributor has not signed or does not have an associated GitHub account, the CLA check will fail and the pull request is unable to be merged.

### Releasing changes

This repository uses [Changesets](https://github.com/changesets/changesets) to manage package versions and changelogs. Do not edit package `CHANGELOG.md` files manually; the release process generates them from changesets.

For a user-facing public-package change, run `pnpm changeset`. This command prompts you to select the affected packages, choose a patch, minor, or major release, and write a description. Repository configuration, documentation, examples, and tests generally do not need a changeset.

This command creates a file in the `.changeset` directory at the root of the repo. The contents of these files will be included in the changelog entries of each affected package. If you have additional detail or migration instructions related to the change, you can add it as markdown to the generated file.

Once you are satisfied with the content of the file, commit it alongside the rest of your changes, and merge it as part of your normal PR flow. Don’t worry, the new version will not be published immediately! A Shopify developer will take care of actually publishing the new versions.

#### Publishing new versions

> **Note:** currently, only Shopify developers can publish new versions of packages.

Once changeset files are merged into `main`, a [GitHub Actions workflow](./.github/workflows/changesets.yml) creates or updates a release pull request with the generated package versions and changelogs. Shopify maintainers merge that pull request, and the release workflows publish the packages to npm.

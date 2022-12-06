# Contributing

## [Code of conduct](./CODE_OF_CONDUCT.md).

All contributors **must** adhere to the code of conduct. Read the [full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Ways to contribute

There are many ways to contribute to remote-ui, some of which are:

- Filing bug reports or requesting new features by [opening an issue](https://github.com/Shopify/remote-ui/issues/new)
- Hacking on an issue from our [backlog](https://github.com/Shopify/remote-ui/issues)
- Improving tests, documentation, or examples

## Development

### Getting started

Clone this repo, then run `yarn install`. This repo uses [yarn](https://yarnpkg.com) for package management. The codebase is entirely written in [TypeScript](https://www.typescriptlang.org).

### Development tasks

remote-ui uses [loom](https://www.npmjs.com/package/@shopify/loom-cli) for all development tasks. You will see `loom.config.ts` files at the root of the repo, and for each package, which control the way those packages are built, tested, and more.

#### Type check

Run `yarn type-check`, which will run TypeScript’s `tsc` command on the repo.

This repo uses [project references](https://www.typescriptlang.org/docs/handbook/project-references.html), with each package represented as a project, as well as one project for all the non-source code files (tests, config, etc). Make sure you understand how to configure the `tsconfig.json` of projects, like setting the `references` key to include the path to any other packages whose types a given project depends on.

#### Lint

Run `yarn lint`, which will run the entire codebase through [ESLint](https://eslint.org) and [Prettier](https://prettier.io).

#### Test

Run `yarn test`, which will run all tests in the repo in [jest’s](https://jestjs.io) watch mode.

Tests are currently a little sparse, focused mostly on ensuring good end-to-end behavior when using all the libraries together. Additional tests can be added for public APIs in each package by including files with a `.test.ts` or `.test.tsx` extension. Make sure you adhere to the structure of the other tests in the repo, and it would be extra appreciated if you understand a little about [Shopify’s approach to front-end testing (sorry to external contributors, this is an internal Shopify link)](https://github.com/Shopify/web-foundations/blob/main/handbook/Best%20Practices/Testing.md).

#### Build

To build all the package outputs for the repo, run `yarn build`. This command builds multiple versions of each package. Some of these versions, like the `.esnext` version of the project you will see, preserve most of the original source code, so that build tools can be configured to parse, process, polyfill, and minify this code in the same way the rest of an application’s codebase. This helps to significantly reduce the bundle size of these packages.

`yarn build` is automatically run before the project is published. You only need to run it manually when you want to verify the outputs it produces (all of which are ignored in `git`).

### Contributing a change

If this is your first contribution to a project on GitHub, you may find this [free video series on contributing to open source useful](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

If you are fixing a minor issue, feel free to send a pull request directly. If you are working on a non-trivial bug or feature, though, we’d appreciate if you could first [open an issue](https://github.com/Shopify/remote-ui/issues) so we can make sure the process goes smoothly. If you are taking on an issue, please leave a comment stating that you intend to work on it.

**Before submitting a pull request**, please:

1. Fork the repository and create your branch from `main`
1. Run `yarn install` from the repository root
1. Make sure your changes do not cause errors to be thrown when running `yarn test`, `yarn lint`, or `yarn type-check` (these will also be checked automatically when you open your pull request, as they run as part of remote-ui’s [GitHub Action-based CI](./.github/workflows/ci.yml))
1. Add a description of your changes to package’s `CHANGELOG.md`
1. Add a [changeset using `yarn changeset add`](#releasing-changes)
1. If you haven’t already, [sign a Contributor License Agreement](https://cla.shopify.com/)

#### Contributor License Agreement (CLA)

Each contributor is required to [sign a CLA](https://cla.shopify.com/). This process is automated as part of your first pull request and is only required once. If any contributor has not signed or does not have an associated GitHub account, the CLA check will fail and the pull request is unable to be merged.

### Releasing changes

This repo uses [Changesets](https://github.com/changesets/changesets) to manage releases. As you contribute changes to the repo, you can include changeset files that describe the packages being changed, the significance of the change, and a detailed description.

Before you create a PR for your change, run `yarn changeset`. This command will prompt you to select the packages and type (patch, minor, or major) of change you are working on. You will also be asked for an initial description.

This command creates a file in the `.changeset` directory at the root of the repo. The contents of these files will be included in the changelog entries of each affected package. If you have additional detail or migration instructions related to the change, you can add it as markdown to the generated file.

Once you are satisfied with the content of the file, commit it alongside the rest of your changes, and merge it as part of your normal PR flow. Don’t worry, the new version will not be published immediately! A Shopify developer will take care of actually publishing the new versions.

#### Publishing new versions

> **Note:** currently, only Shopify developers can publish new versions of packages.

Once changeset files are merged into the `main` branch of this repo, a [Github action](./.github/workflows/changesets.yml) will create a new PR to apply all the outstanding changesets to their respective packages, creating a new set of package versions. You just need to merge that PR, and the robots will take care of publishing the changes to NPM!

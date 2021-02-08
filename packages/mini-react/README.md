# `@remote-ui/mini-react`

This library provides a small, React-like API for working with a [`@remote-ui/core` `ReactRoot`](../core#remoteroot). Its implementation is a minimally updated copy of [Preact](https://preactjs.com), and like Preact, it provides a React-compatible API with significantly smaller bundle size than using React through [`@remote-ui/react`](../react).

## Installation

Using `yarn`:

```
yarn add @remote-ui/mini-react
```

or, using `npm`:

```
npm install @remote-ui/mini-react --save
```

## Usage

`@remote-ui/mini-react` provides all of the core React APIs with a minimal size and runtime overhead. The following classes and functions from React are exported from the main `@remote-ui/preact` entrypoint, and all have identical APIs to their Preact/ React equivalents:

- [`render`](https://preactjs.com/guide/v10/api-reference#render)
- [`createElement`](https://preactjs.com/guide/v10/api-reference#h--createelement) (also aliased as `h`)
- [`cloneElement`](https://preactjs.com/guide/v10/api-reference#cloneelement)
- [`createContext`](https://preactjs.com/guide/v10/api-reference#createcontext)
- [`createRef`](https://preactjs.com/guide/v10/api-reference#createref)
- [`Component`](https://preactjs.com/guide/v10/api-reference#component)
- [`Fragment`](https://preactjs.com/guide/v10/api-reference#fragment)
- [`useState`, `useReducer`, `useMemo`, `useCallback`, `useRef`, `useContext`, and `useLayoutEffect`](https://preactjs.com/guide/v10/hooks)

The simplest usage of this library involves importing and using the above APIs directly. You’ll also usually need to install and use the `@remote-ui/core` library, since it provides the tree structure that `@remote-ui/mini-react` is designed to control.

```ts
import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';
import {render, h} from '@remote-ui/mini-react';

const Button = createRemoteComponent<'Button', {onPress(): void}>('Button');

function App() {
  return h(Button, {onPress: () => console.log('Pressed!')}, 'Pay now');
}

const root = createRemoteRoot(() => {});
render(h(App), root);
```

The `h` function shown above creates “virtual nodes”, the data model used by this library to represent your application. Many developers prefer to use JSX to avoid repeated calls to `h`, but JSX requires a build step. This library provides a tight integration with [HTM](https://github.com/developit/htm), a build-step-free alternative to JSX. The [Preact documentation](https://preactjs.com/guide/v10/getting-started#alternatives-to-jsx) provides a great overview of the benefits of HTM:

> [HTM](https://github.com/developit/htm) is a JSX-like syntax that works in standard JavaScript. Instead of requiring a build step, it uses JavaScript's own [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates) syntax, which was added in 2015 and is supported in [all modern browsers](https://caniuse.com/#feat=template-literals).

You can use HTM to create `@remote-ui/mini-react` components using the `ui` function exported by the `@remote-ui/mini-react/htm` entrypoint. This entrypoint also exports all the other functions documented above for convenience.

```ts
import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';
import {render, ui} from '@remote-ui/mini-react/htm';

const Button = createRemoteComponent<'Button', {onPress(): void}>('Button');

function App() {
  return ui`<${Button} onPress=${() => console.log('Pressed!')}>Pay now<//>`;
}

const root = createRemoteRoot(() => {});
render(ui`<${App} />`, root);
```

If you prefer to use JSX, you can do so with `@remote-ui/mini-react` by applying a few tweaks to your build tooling. Most developers use [Babel](https://babeljs.io) to transform their JSX into valid JavaScript. You can configure [Babel’s `@babel/plugin-transform-react-jsx` plugin](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx) to convert JSX expressions to the relevant `@remote-ui/mini-react` functions by including the configuration below wherever you control your Babel config:

```json
{
  "plugins": [
    [
      "@babel/plugin-transform-react-jsx",
      {
        "pragma": "h",
        "pragmaFrag": "Fragment"
      }
    ]
  ]
}
```

### Aliasing React to `@remote-ui/mini-react`

If you want to use the existing React ecosystem, or you prefer to use some of the additional APIs provided by React yourself, you can do so by pointing all imports of `react` to `@remote-ui/mini-react`. This is called “aliasing”, and it allows code to think it is still using the “regular” React, while providing the smaller, more optimized APIs from this library at runtime.

#### Aliasing in [Webpack](https://webpack.js.org)

To alias any package in webpack, you need to add the `resolve.alias` section to your config. Depending on the configuration you're using, this section may already be present, but missing the aliases for Preact.

```js
const config = {
  //...snip
  resolve: {
    alias: {
      react$: '@remote-ui/mini-react/compat',
      'react/jsx-runtime$': '@remote-ui/mini-react/jsx-runtime',
      'react-dom': '@remote-ui/mini-react/compat',
      '@remote-ui/react$': '@remote-ui/mini-react/compat',
    },
  },
};
```

#### Aliasing in [Parcel](https://parceljs.org)

Parcel uses the standard `package.json` file to read configuration options under an `alias` key.

```json
{
  "alias": {
    "react/jsx-runtime": "@remote-ui/mini-react/jsx-runtime",
    "react": "@remote-ui/mini-react/compat",
    "react-dom": "@remote-ui/mini-react/compat",
    "@remote-ui/react": "@remote-ui/mini-react/compat"
  }
}
```

#### Aliasing in [Rollup](https://rollupjs.org/guide/en/)

To alias within Rollup, you'll need to install [@rollup/plugin-alias](https://github.com/rollup/plugins/tree/master/packages/alias). The plugin will need to be placed before your [@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve).

```js
import alias from '@rollup/plugin-alias';

module.exports = {
  plugins: [
    alias({
      entries: [
        {
          find: 'react/jsx-runtime',
          replacement: '@remote-ui/mini-react/jsx-runtime',
        },
        {find: 'react', replacement: '@remote-ui/mini-react/compat'},
        {find: 'react-dom', replacement: '@remote-ui/mini-react/compat'},
        {find: '@remote-ui/react', replacement: '@remote-ui/mini-react/compat'},
      ],
    }),
  ],
};
```

#### Aliasing in [Jest](https://jestjs.io/)

Jest allows the rewriting of module paths similar to bundlers. These rewrites are configured using regular expressions in your Jest configuration:

```json
{
  "moduleNameMapper": {
    "^react$": "@remote-ui/mini-react/compat",
    "^react/jsx-runtime$": "@remote-ui/mini-react/jsx-runtime",
    "^react-dom$": "@remote-ui/mini-react/compat",
    "^@remote-ui/react$": "@remote-ui/mini-react/compat",
    "^@quilted/react-testing$": "@remote-ui/mini-react/testing"
  }
}
```

### Testing

This library provides a version of [`@quilted/react-testing`](https://github.com/lemonmade/quilt/tree/main/packages/react-testing) that works with this “version” of React. All of the APIs documented for `@quilted/react-testing` are available through the `@remote-ui/mini-react/testing` entrypoint:

```ts
import {ui, useState} from '@remote-ui/mini-react/htm';
import {mount} from '@remote-ui/mini-react/testing';

function MyComponent() {
  const [pressed, setPressed] = useState(0);

  return ui`
    <RemoteButton onPress=${() =>
      setPressed((pressed) => pressed + 1)}>Press me!<//>
    <RemoteText>Pressed ${pressed} times<//>
  `;
}

const myComponent = mount(ui`<${MyComponent} />`);
myComponent.find('RemoteButton').trigger('onPress');

assert(myComponent.find('RemoteText').text.indexOf('1') > -1);
```

# Polyfills

The default builds of packages in this repo (the ones you’d get if you `require('@remote-ui/x')` or `import {} from '@remote-ui/x'`) include the polyfills necessary for that code to run. This is done to prevent accidentally shipping a feature based on remote-ui that fails in older browsers, which do not have some of the globals (like `WeakSet`, `WeakMap`, or `Symbol`) that the libraries use internally. The polyfills are inlined with Babel.

Some projects will have an existing conditional polyfilling setup that they may prefer to use. For example, at Shopify, we render multiple versions of our apps, targeting different browser groups, and we want all code (including as many of our apps’ dependencies as possible) to only have the minimal number of language features transpiled, and polyfills imported, for that browser support.

All of the `@remote-ui` packages support this pattern with a special `.esnext` version of the package you will see after running `yarn build`. These `.esnext` files are basically the original source, but without any types, excess compilation, or automatic polyfills. This version of the library also preserves all `import`s and `export`s, allowing the libraries to be effectively [“tree shaken”](https://webpack.js.org/guides/tree-shaking/).

Applications can configure their build tools to prefer these `.esnext` versions, and to process the code inside using the same processing they use for their own source. The example below illustrates how we at Shopify use [webpack](https://webpack.js.org) and [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) to accomplish this:

```js
// in your webpack config...

// We force Babel to use the specified presets only. The configuration of the
// allowed targets can also be done in a `browserslist` config, instead of inline
// in your webpack config.
// @see https://babeljs.io/docs/en/babel-preset-env
const babelLoader = {
  loader: 'babel-loader',
  options: {
    configFile: false,
    presets: [
      [
        '@babel/preset-env',
        {modules: false, targets: '@extends my-browserslist-config'},
      ],
    ],
  },
};

module.exports = {
  resolve: {
    // This forces .esnext versions of a file to be preferred by Webpack.
    // @see https://webpack.js.org/configuration/resolve/#resolveextensions
    extensions: ['.esnext', '.mjs', '.js', '.json'],
    // This prefers an "esnext" main field, in case the package explicitly specifies a main
    mainFields: ['esnext', 'browser', 'module', 'main'],
  },
  module: {
    rules: [
      // We use the exact same Babel loader configuration for `.esnext` files
      // as we do for the source files in our application.
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: babelLoader,
      },
      {
        test: /\.esnext$/,
        include: /@remote-ui/,
        loader: babelLoader,
      },
    ],
  },
};
```

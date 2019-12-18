This directory contains the output of building a small script that uses these libraries. I used `webpack`, with production mode, targetting the `.esnext` build. The following was used to test the core libraries (the resulting bundle was [**1.69 kB** gzip](./core.html)):

```tsx
import {createRemoteRoot, Dispatch} from '@remote-ui/core';
import {retain} from 'remote-call';

global.render = (dispatch: Dispatch) => {
  const root = createRemoteRoot(dispatch, {});
  retain(dispatch);
  console.log(root);
};
```

The following was used to test the react integration (the resulting bundle was [**27.2 kB** gzip](./react.html)):

```tsx
import React from 'react';
import {createRemoteRoot, Dispatch} from '@remote-ui/core';
import {render} from '@remote-ui/react';
import {retain} from 'remote-call';

function App() {
  return null;
}

global.render = (dispatch: Dispatch) => {
  const root = createRemoteRoot(dispatch, {});
  retain(dispatch);
  render(<App />, root);
};
```

For context, the following produced a [**20.2 kB** gzip bundle](./app-bridge.html):

```ts
import {Context} from '@shopify/app-bridge';

global.render = () => {
  console.log(Context);
};
```

And the following code produced a [**64.1 kB** gzip bundle](./app-bridge-react.html) (important to note that this would only be usable in an iframe, whereas all three previous bundles should be fine to run in workers):

```tsx
import React from 'react';
import {render} from 'react-dom';
import {Loading} from '@shopify/app-bridge-react';

global.render = () => {
  render(<Loading />, document.querySelector('#app'));
};
```

## Appendix

Webpack config used for the build:

```js
const {resolve} = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

module.exports = {
  entry: resolve(__dirname, 'test/index'),
  output: {path: resolve(__dirname, 'build/test')},
  resolve: {
    extensions: ['.esnext', '.js', '.ts', '.tsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: false,
                    targets: [
                      'last 3 chrome versions',
                      'last 3 chromeandroid versions',
                      'last 3 firefox versions',
                      'last 3 opera versions',
                      'last 2 edge versions',
                      'safari >= 10',
                      'ios >= 10',
                    ],
                  },
                ],
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
            },
          },
        ],
      },
    ],
  },
  plugins: [new BundleAnalyzerPlugin({analyzerMode: 'static'})],
};
```

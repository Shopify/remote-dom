import {createComposedProjectPlugin} from '@sewing-kit/plugins';

import {javascriptProjectPlugin} from '@sewing-kit/plugin-javascript';
import {typeScriptProjectPlugin} from '@sewing-kit/plugin-typescript';
import {jestProjectPlugin} from '@sewing-kit/plugin-jest';
import {reactProjectPlugin} from '@sewing-kit/plugin-react';
import {babelProjectPlugin} from '@sewing-kit/plugin-babel';
import {createPackageFlexibleOutputsPlugin} from '@sewing-kit/plugin-package-flexible-outputs';

export const defaultProjectPlugin = createComposedProjectPlugin(
  'RemoteUi.DefaultProject',
  [
    babelProjectPlugin,
    jestProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    reactProjectPlugin,
    createPackageFlexibleOutputsPlugin({
      esmodules: false,
    }),
  ],
);

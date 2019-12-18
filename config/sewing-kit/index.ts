import {
  createComposedProjectPlugin,
  createProjectTestPlugin,
} from '@sewing-kit/plugins';

import {javascriptProjectPlugin} from '@sewing-kit/plugin-javascript';
import {typeScriptProjectPlugin} from '@sewing-kit/plugin-typescript';
import {jestProjectPlugin} from '@sewing-kit/plugin-jest';
import {reactProjectPlugin} from '@sewing-kit/plugin-react';
import {babelProjectPlugin} from '@sewing-kit/plugin-babel';
import {createPackageFlexibleOutputsPlugin} from '@sewing-kit/plugin-package-flexible-outputs';

const PLUGIN = 'RemoteUi.DefaultProject';

export const defaultProjectPlugin = createComposedProjectPlugin(PLUGIN, [
  babelProjectPlugin,
  jestProjectPlugin,
  javascriptProjectPlugin,
  typeScriptProjectPlugin,
  reactProjectPlugin,
  createPackageFlexibleOutputsPlugin({
    esmodules: false,
  }),
  createProjectTestPlugin(PLUGIN, ({hooks}) => {
    hooks.project.tap(PLUGIN, ({hooks}) => {
      hooks.configure.tap(PLUGIN, (hooks) => {
        hooks.jestEnvironment?.tap(PLUGIN, () => 'jsdom');
      });
    });
  }),
]);

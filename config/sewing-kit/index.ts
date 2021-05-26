import {
  createProjectPlugin,
  createComposedProjectPlugin,
} from '@sewing-kit/plugins';

import {javascript, updateBabelPreset} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {react} from '@sewing-kit/plugin-react';
import {packageBuild} from '@sewing-kit/plugin-package-build';

import type {} from '@sewing-kit/plugin-jest';

const PLUGIN = 'RemoteUi.DefaultProject';

const updateReactBabelPreset = updateBabelPreset(['@babel/preset-react'], {
  runtime: 'automatic',
  importSource: 'react',
});

export function defaultProjectPlugin() {
  return createComposedProjectPlugin(PLUGIN, [
    javascript(),
    typescript(),
    react(),
    packageBuild({browserTargets: 'defaults', nodeTargets: 'defaults'}),
    createProjectPlugin(PLUGIN, ({tasks: {test, build, dev}}) => {
      test.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.babelConfig?.hook(updateReactBabelPreset);
          configure.jestEnvironment?.hook(() => 'jsdom');
        });
      });

      build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook((configure) => {
            configure.babelConfig?.hook(updateReactBabelPreset);
          });
        });
      });

      dev.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.babelConfig?.hook(updateReactBabelPreset);
        });
      });
    }),
  ]);
}

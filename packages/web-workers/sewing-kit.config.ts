import {createPackage, Runtime} from '@sewing-kit/config';
import {createProjectBuildPlugin} from '@sewing-kit/plugins';
import {defaultProjectPlugin} from '../../config/sewing-kit';

import type {} from '@sewing-kit/plugin-rollup';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/worker', name: 'worker'});
  pkg.entry({
    root: './src/webpack-parts/index',
    name: 'webpack',
    runtime: Runtime.Node,
  });
  pkg.entry({root: './src/babel-plugin', name: 'babel', runtime: Runtime.Node});
  pkg.entry({
    root: './src/sewing-kit',
    name: 'sewing-kit',
    runtime: Runtime.Node,
  });
  pkg.use(defaultProjectPlugin());

  // The library references the worker "wrapper" files as relative paths from
  // the source code. Because they aren’t in the dependency graph, Rollup
  // does not bundle them. This sewing-kit plugin adds a copy rollup plugin
  // that manually moves them into the right build directory.
  pkg.use(
    createProjectBuildPlugin('RemoteUI.CopyWrappers', ({hooks, project}) => {
      hooks.target.hook(({hooks, target}) => {
        hooks.configure.hook(({rollupPlugins}) => {
          rollupPlugins.hook(async (plugins) => {
            // Only add this step for the default variant
            if (Object.keys(target.options).length > 0) return plugins;

            const {default: copy} = await import('rollup-plugin-copy');

            return [
              ...plugins,
              copy({
                targets: [
                  {
                    src: project.fs.resolvePath('src/wrappers/*'),
                    dest: [
                      project.fs.buildPath('cjs/wrappers'),
                      project.fs.buildPath('esm/wrappers'),
                      project.fs.buildPath('esnext/wrappers'),
                    ],
                  },
                ],
              }),
            ];
          });
        });
      });
    }),
  );
});

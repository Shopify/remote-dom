import {createPackage, Runtime} from '@sewing-kit/config';
import {createProjectBuildPlugin} from '@sewing-kit/plugins';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/worker', name: 'worker'});
  pkg.entry({
    root: './src/webpack-parts',
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
  pkg.use(copyWrappersPlugin);
});

const copyWrappersPlugin = createProjectBuildPlugin(
  'RemoteUi.CopyWrappers',
  ({api, hooks, project}) => {
    hooks.steps.hook((steps, {variant}) => [
      ...steps,
      api.createStep(
        {id: 'RemoteUi.CopyWrappers', label: 'Copying wrapper files'},
        async () => {
          const {copy} = await import('fs-extra');
          const variantName = Object.keys(variant)[0];

          await copy(
            project.fs.resolvePath('src/wrappers'),
            project.fs.buildPath(
              variantName === 'commonjs' ? 'cjs' : variantName,
              'wrappers',
            ),
            {
              overwrite: true,
              recursive: true,
            },
          );
        },
      ),
    ]);
  },
);

import {createComposedProjectPlugin, Package} from '@shopify/loom';
import {buildLibrary, babel} from '@shopify/loom-plugin-build-library';

const PLUGIN = 'RemoteUi.DefaultProject';

export function defaultProjectPlugin({react = false} = {}) {
  return createComposedProjectPlugin<Package>(PLUGIN, [
    buildLibrary({
      commonjs: true,
      esmodules: true,
      esnext: true,
      targets: 'extends @shopify/browserslist-config, node 12.13',
      jestTestEnvironment: 'jsdom',
    }),
    babel({
      config: {
        presets: [
          [
            '@shopify/babel-preset',
            {
              typescript: true,
              react,
              reactOptions: react
                ? {
                    runtime: 'automatic',
                    importSource: 'react',
                  }
                : undefined,
            },
          ],
        ],
      },
    }),
  ]);
}

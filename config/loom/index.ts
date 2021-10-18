import {createComposedProjectPlugin, Package} from '@shopify/loom';
import {buildLibrary, babel} from '@shopify/loom-plugin-build-library';

const PLUGIN = 'RemoteUi.DefaultProject';

export function defaultProjectPlugin({react = false} = {}) {
  return createComposedProjectPlugin<Package>(PLUGIN, [
    buildLibrary({
      jestEnvironment: 'jsdom',
      browserTargets: 'extends @shopify/browserslist-config',
      nodeTargets: 'node 12.13',
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

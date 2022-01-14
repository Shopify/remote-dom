import {createPackage, Runtime, createProjectTestPlugin} from '@shopify/loom';
import type {} from '@shopify/loom-plugin-jest';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index.ts'});
  pkg.entry({root: './src/host/index.ts', name: 'host'});
  pkg.use(defaultProjectPlugin());
  pkg.use(
    createProjectTestPlugin('Vue', ({hooks}) => {
      hooks.configure.hook(({jestTransform}) => {
        jestTransform?.hook((transforms) => ({
          ...transforms,
          '^.+\\.vue$': '@vue/vue3-jest',
        }));
      });
    }),
  );
});

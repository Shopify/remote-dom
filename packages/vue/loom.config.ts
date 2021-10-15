import {createPackage, Runtime, createProjectTestPlugin} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/host', name: 'host'});
  pkg.use(defaultProjectPlugin());
  pkg.use(
    createProjectTestPlugin('Vue', ({hooks}) => {
      hooks.configure.hook(({jestTransforms}) => {
        jestTransforms?.hook((transforms) => ({
          ...transforms,
          '^.+\\.vue$': '@vue/vue3-jest',
        }));
      });
    }),
  );
});

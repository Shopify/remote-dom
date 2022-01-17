import {createPackage, createProjectTestPlugin, Runtime} from '@shopify/loom';
import type {} from '@shopify/loom-plugin-jest';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index.ts'});
  pkg.entry({name: 'compat', root: './src/compat/index.ts'});
  pkg.entry({name: 'htm', root: './src/htm-binding.ts'});
  pkg.entry({name: 'jsx-runtime', root: './src/jsx-runtime.ts'});
  pkg.entry({name: 'jsx-dev-runtime', root: './src/jsx-runtime.ts'});
  pkg.entry({
    name: 'testing',
    root: './src/testing/index.ts',
    runtime: Runtime.Node,
  });
  pkg.use(
    defaultProjectPlugin({react: true}),
    createProjectTestPlugin('AliasRUIReactTesting', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestModuleNameMapper?.hook((moduleMapper) => {
          return {...moduleMapper, '^react$': '@remote-ui/mini-react/compat'};
        });
      });
    }),
  );
});

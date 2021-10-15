import {createPackage, createProjectTestPlugin, Runtime} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'compat', root: './src/compat'});
  pkg.entry({name: 'htm', root: './src/htm-binding'});
  pkg.entry({name: 'jsx-runtime', root: './src/jsx-runtime'});
  pkg.entry({name: 'jsx-dev-runtime', root: './src/jsx-runtime'});
  pkg.entry({name: 'testing', root: './src/testing', runtime: Runtime.Node});
  pkg.use(
    defaultProjectPlugin({react: true}),
    createProjectTestPlugin('AliasRUIReactTesting', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestModuleMapper?.hook((moduleMapper) => {
          return {...moduleMapper, '^react$': '@remote-ui/mini-react/compat'};
        });
      });
    }),
  );
});

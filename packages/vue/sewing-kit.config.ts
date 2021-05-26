import {createPackage, Runtime} from '@sewing-kit/config';
import {createProjectTestPlugin} from '@sewing-kit/plugins';
import {defaultProjectPlugin} from '../../config/sewing-kit';

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
          '^.+\\.vue$': 'vue-jest',
        }));
      });
    }),
  );
});

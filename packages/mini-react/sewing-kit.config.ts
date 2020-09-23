import {createPackage} from '@sewing-kit/config';
import {createProjectTestPlugin} from '@sewing-kit/plugins';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'hooks', root: './src/hooks'});
  pkg.entry({name: 'compat', root: './src/compat'});
  pkg.entry({name: 'testing', root: './src/testing'});
  pkg.use(
    defaultProjectPlugin(),
    createProjectTestPlugin('AliasRUIReactTesting', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestModuleMapper?.hook((moduleMapper) => {
          return {...moduleMapper, '^react$': '@remote-ui/mini-react/compat'};
        });
      });
    }),
  );
});

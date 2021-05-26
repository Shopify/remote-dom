import {createPackage, Runtime} from '@sewing-kit/config';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/host', name: 'host'});
  pkg.use(defaultProjectPlugin());
});

import {createPackage, Runtime} from '@sewing-kit/config';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index'});
  pkg.entry({root: './src/worker', name: 'worker'});
  pkg.entry({
    root: './src/webpack-parts/index',
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
});

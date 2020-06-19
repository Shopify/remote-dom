import {createPackage, Runtime} from '@sewing-kit/config';
import {defaultProjectPlugin} from '../../config/sewing-kit';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'browser', root: './src/browser', runtime: Runtime.Browser});
  pkg.use(defaultProjectPlugin());
});

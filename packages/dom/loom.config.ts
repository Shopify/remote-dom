import {createPackage, Runtime} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index'});
  pkg.entry({name: 'browser', root: './src/browser', runtime: Runtime.Browser});
  pkg.use(defaultProjectPlugin());
});

import {createPackage, Runtime} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node);
  pkg.entry({root: './src/index.ts'});
  pkg.entry({name: 'matchers', root: './src/matchers/index.ts'});
  pkg.use(defaultProjectPlugin());
});

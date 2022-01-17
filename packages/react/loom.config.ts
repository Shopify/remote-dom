import {createPackage, Runtime} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.runtimes(Runtime.Node, Runtime.Browser);
  pkg.entry({root: './src/index.ts'});
  pkg.entry({root: './src/host/index.ts', name: 'host'});
  pkg.use(defaultProjectPlugin({react: true}));
});

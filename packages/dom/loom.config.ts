import {createPackage, Runtime} from '@shopify/loom';

import {defaultProjectPlugin} from '../../config/loom';

export default createPackage((pkg) => {
  pkg.entry({root: './src/index.ts'});
  pkg.entry({
    name: 'browser',
    root: './src/browser.ts',
    runtime: Runtime.Browser,
  });
  pkg.use(defaultProjectPlugin());
});

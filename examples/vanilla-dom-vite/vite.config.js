import {defineConfig} from 'vite';
import path from 'path';

const packagesBase = path.join(__dirname, '..', '..', 'packages');

function getPathForPackage(packageName) {
  return path.join(packagesBase, packageName, 'src');
}

export default defineConfig({
  root: 'app',
  resolve: {
    alias: {
      '@remote-ui/core': getPathForPackage('core'),
      '@remote-ui/rpc': getPathForPackage('rpc'),
      '@remote-ui/dom': getPathForPackage('dom'),
    },
  },
});

import {defineConfig} from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

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
      '@remote-ui/react': getPathForPackage('react'),
    },
  },
  // We need to disable fast refresh for the React plugin, as it doesn’t work in workers
  // as it tries to access `window`
  plugins: [react({fastRefresh: false})],
});

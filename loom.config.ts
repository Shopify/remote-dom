import {createWorkspace} from '@shopify/loom';
import {eslint} from '@shopify/loom-plugin-eslint';
import {prettier} from '@shopify/loom-plugin-prettier';
import {buildLibraryWorkspace} from '@shopify/loom-plugin-build-library';

export default createWorkspace((workspace) => {
  workspace.use(
    buildLibraryWorkspace(),
    eslint(),
    prettier({files: '**/*.{md,json,yaml,yml}'}),
  );
});

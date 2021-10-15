import {createWorkspace} from '@shopify/loom';
import {eslint} from '@shopify/loom-plugin-eslint';
import {prettier} from '@shopify/loom-plugin-prettier';
import {workspaceTypeScript} from '@shopify/loom-plugin-typescript';
import {jest} from '@shopify/loom-plugin-jest';

export default createWorkspace((workspace) => {
  workspace.use(
    workspaceTypeScript(),
    jest(),
    eslint(),
    prettier({files: '**/*.{md,json,yaml,yml}'}),
  );
});

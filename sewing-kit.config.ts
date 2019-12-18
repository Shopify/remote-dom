import {createWorkspace} from '@sewing-kit/config';
import {createComposedWorkspacePlugin} from '@sewing-kit/plugins';

import {eslintWorkspacePlugin} from '@sewing-kit/plugin-eslint';
import {javascriptWorkspacePlugin} from '@sewing-kit/plugin-javascript';
import {typeScriptWorkspacePlugin} from '@sewing-kit/plugin-typescript';
import {jestWorkspacePlugin} from '@sewing-kit/plugin-jest';

const plugin = createComposedWorkspacePlugin('RemoteUi.Workspace', [
  eslintWorkspacePlugin,
  javascriptWorkspacePlugin,
  typeScriptWorkspacePlugin,
  jestWorkspacePlugin,
]);

export default createWorkspace((workspace) => {
  workspace.plugin(plugin);
});

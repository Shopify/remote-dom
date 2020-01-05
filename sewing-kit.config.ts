import {createWorkspace} from '@sewing-kit/config';

import {eslint} from '@sewing-kit/plugin-eslint';
import {workspaceJavaScript} from '@sewing-kit/plugin-javascript';
import {workspaceTypeScript} from '@sewing-kit/plugin-typescript';
import {jest} from '@sewing-kit/plugin-jest';

export default createWorkspace((workspace) => {
  workspace.use(eslint(), workspaceJavaScript(), workspaceTypeScript(), jest());
});

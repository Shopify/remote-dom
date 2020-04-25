import {
  createComposedProjectPlugin,
  createProjectTestPlugin,
} from '@sewing-kit/plugins';

import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {jestProjectHooks} from '@sewing-kit/plugin-jest';
import {react} from '@sewing-kit/plugin-react';
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';

const PLUGIN = 'RemoteUi.DefaultProject';

export function defaultProjectPlugin() {
  return createComposedProjectPlugin(PLUGIN, [
    javascript(),
    typescript(),
    jestProjectHooks(),
    react(),
    buildFlexibleOutputs({
      esmodules: false,
    }),
    createProjectTestPlugin(PLUGIN, ({hooks}) => {
      hooks.configure.hook((configure) => {
        configure.jestEnvironment?.hook(() => 'jsdom');
      });
    }),
  ]);
}

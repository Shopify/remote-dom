import {
  createComposedProjectPlugin,
  createProjectTestPlugin,
} from '@sewing-kit/plugins';

import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {react} from '@sewing-kit/plugin-react';
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';

import type {} from '@sewing-kit/plugin-jest';

const PLUGIN = 'RemoteUi.DefaultProject';

export function defaultProjectPlugin() {
  return createComposedProjectPlugin(PLUGIN, [
    javascript(),
    typescript(),
    react(),
    buildFlexibleOutputs(),
    createProjectTestPlugin(PLUGIN, ({hooks}) => {
      hooks.configure.hook((configure) => {
        configure.jestEnvironment?.hook(() => 'jsdom');
      });
    }),
  ]);
}

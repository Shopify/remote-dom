import {
  Project,
  Service,
  createProjectPlugin,
  WaterfallHook,
} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';
import {} from '@sewing-kit/plugin-babel';

import {
  Options as BabelOptions,
  DEFAULT_PACKAGES_TO_PROCESS,
} from './babel-plugin';

const PLUGIN = 'Quilt.WebWorkers';

export interface Options {}

interface Hooks {
  readonly remoteUiWorkerWebpackPlugins: WaterfallHook<
    readonly import('webpack').Plugin[]
  >;
  readonly remoteUiWorkerWebpackGlobalObject: WaterfallHook<string>;
  readonly remoteUiWorkerNoop: WaterfallHook<boolean>;
  readonly remoteUiWorkerApplyBabelToPackages: WaterfallHook<
    NonNullable<BabelOptions['packages']>
  >;
}

declare module '@sewing-kit/hooks' {
  interface DevProjectConfigurationCustomHooks extends Hooks {}
  interface BuildProjectConfigurationCustomHooks extends Hooks {}
}

const addHooks = (hooks: any) => ({
  ...hooks,
  remoteUiWorkerWebpackPlugins: new WaterfallHook(),
  remoteUiWorkerWebpackGlobalObject: new WaterfallHook(),
  remoteUiWorkerNoop: new WaterfallHook(),
  remoteUiWorkerApplyBabelToPackages: new WaterfallHook(),
});

export function webWorkers(_options?: Options) {
  return createProjectPlugin(PLUGIN, ({tasks: {dev, build}, project}) => {
    dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(project, configure),
        );
        configure.webpackPlugins?.hook(createWebpackPluginAdder(configure));
      });
    });

    build.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(project, configure),
        );
        configure.webpackPlugins?.hook(createWebpackPluginAdder(configure));
      });
    });
  });
}

function createBabelConfigUpdater(project: Project, configure: Partial<Hooks>) {
  return async (
    babelConfig: import('@sewing-kit/plugin-babel').BabelConfig,
  ): Promise<typeof babelConfig> => {
    const [noop, packages] = await Promise.all([
      configure.remoteUiWorkerNoop!.run(project instanceof Service),
      configure.remoteUiWorkerApplyBabelToPackages!.run(
        DEFAULT_PACKAGES_TO_PROCESS,
      ),
    ] as const);

    return {
      ...babelConfig,
      plugins: [
        ...(babelConfig.plugins ?? []),
        [require.resolve('./babel-plugin'), {noop, packages} as BabelOptions],
      ],
    };
  };
}

function createWebpackPluginAdder(configure: Partial<Hooks>) {
  return async (plugins: readonly import('webpack').Plugin[]) => {
    const [{WebWorkerPlugin}, globalObject, workerPlugins] = await Promise.all([
      import('./webpack-parts'),
      configure.remoteUiWorkerWebpackGlobalObject!.run('self'),
      configure.remoteUiWorkerWebpackPlugins!.run([]),
    ] as const);

    return [
      ...plugins,
      new WebWorkerPlugin({globalObject, plugins: workerPlugins}),
    ];
  };
}

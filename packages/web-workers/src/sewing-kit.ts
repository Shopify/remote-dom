import {
  addHooks,
  createProjectPlugin,
  WaterfallHook,
  Runtime,
  TargetRuntime,
} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-webpack';
import type {BabelConfig} from '@sewing-kit/plugin-javascript';

import {
  Options as BabelOptions,
  DEFAULT_PACKAGES_TO_PROCESS,
} from './babel-plugin';

const PLUGIN = 'Quilt.WebWorkers';

export interface Options {
  noop?: boolean;
  webpackGlobalObject?: string;
  webpackPlugins?: readonly import('webpack').Plugin[];
  applyBabelToPackages?: NonNullable<BabelOptions['packages']>;
}

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

const addWorkerHooks = addHooks<Hooks>(() => ({
  remoteUiWorkerNoop: new WaterfallHook(),
  remoteUiWorkerWebpackPlugins: new WaterfallHook(),
  remoteUiWorkerWebpackGlobalObject: new WaterfallHook(),
  remoteUiWorkerApplyBabelToPackages: new WaterfallHook(),
}));

export function webWorkers(options: Options = {}) {
  return createProjectPlugin(PLUGIN, ({tasks: {dev, build}, project}) => {
    dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addWorkerHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(
            TargetRuntime.fromProject(project),
            configure,
            options,
          ),
        );
        configure.webpackPlugins?.hook(
          createWebpackPluginAdder(configure, options),
        );
      });
    });

    build.hook(({hooks}) => {
      hooks.configureHooks.hook(addWorkerHooks);

      hooks.target.hook(({target, hooks}) => {
        hooks.configure.hook((configure) => {
          configure.babelConfig?.hook(
            createBabelConfigUpdater(target.runtime, configure, options),
          );
          configure.webpackPlugins?.hook(
            createWebpackPluginAdder(configure, options),
          );
        });
      });
    });
  });
}

function createBabelConfigUpdater(
  runtime: TargetRuntime,
  configure: Partial<Hooks>,
  {
    noop: defaultNoop = !runtime.includes(Runtime.Browser),
    applyBabelToPackages = {},
  }: Options,
) {
  return async (babelConfig: BabelConfig): Promise<typeof babelConfig> => {
    const [noop, packages] = await Promise.all([
      configure.remoteUiWorkerNoop!.run(defaultNoop),
      configure.remoteUiWorkerApplyBabelToPackages!.run({
        ...DEFAULT_PACKAGES_TO_PROCESS,
        ...applyBabelToPackages,
      }),
    ] as const);

    return {
      ...babelConfig,
      plugins: [
        ...(babelConfig.plugins ?? []),
        [
          require.resolve('./babel-plugin'),
          ({noop, packages} as BabelOptions) as Record<string, unknown>,
        ],
      ],
    };
  };
}

function createWebpackPluginAdder(
  configure: Partial<Hooks>,
  {webpackPlugins = [], webpackGlobalObject = 'self'}: Options,
) {
  return async (plugins: readonly import('webpack').Plugin[]) => {
    const [{WebWorkerPlugin}, globalObject, workerPlugins] = await Promise.all([
      import('./webpack-parts'),
      configure.remoteUiWorkerWebpackGlobalObject!.run(webpackGlobalObject),
      configure.remoteUiWorkerWebpackPlugins!.run(webpackPlugins),
    ] as const);

    return [
      ...plugins,
      new WebWorkerPlugin({globalObject, plugins: workerPlugins}),
    ];
  };
}

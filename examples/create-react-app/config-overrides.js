module.exports = {
  webpack: function (config) {
    const {WebWorkerPlugin} = require('@remote-ui/web-workers/webpack');

    // `self` needs to be used instead of the default `window`, because `self`
    // is available on the main thread and in web workers.
    config.output.globalObject = 'self';

    // See the documentation for @remote-ui/web-workers for details on what
    // this webpack plugin does.
    config.plugins.unshift(new WebWorkerPlugin());

    const {rules} = config.module;

    // For some reason, I can’t get the ESLint rules to stop giving build errors,
    // even though the ESLint rule is disabled...
    const eslintLoaderIndex = rules.findIndex((rule) =>
      Boolean(
        rule.use &&
          rule.use[0] &&
          typeof rule.use[0].loader === 'string' &&
          rule.use[0].loader.includes('eslint-loader'),
      ),
    );
    rules.splice(eslintLoaderIndex, 1);

    // We need to include an additional Babel plugin. To do so, we traverse CRA’s
    // webpack rules to find the Babel loader, then adjust its options. We include
    // this as a preset so that it runs early in Babel’s processing.
    const customPreset = {
      plugins: [require.resolve('@remote-ui/web-workers/babel')],
    };

    for (const rule of rules) {
      if (isBabelRule(rule)) {
        rule.options.presets.push(customPreset);
      }

      if ('oneOf' in rule) {
        for (const nestedRule of rule.oneOf) {
          if (isBabelRule(nestedRule)) {
            nestedRule.options.presets.push(customPreset);
          }
        }
      }
    }

    return config;
  },
};

function isBabelRule(rule) {
  return (
    typeof rule.loader === 'string' && rule.loader.includes('babel-loader')
  );
}

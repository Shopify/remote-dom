const {resolve} = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

module.exports = {
  entry: resolve(__dirname, 'test/index'),
  output: {path: resolve(__dirname, 'build/test')},
  resolve: {
    extensions: ['.esnext', '.js', '.ts', '.tsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: false,
                    targets: [
                      'last 3 chrome versions',
                      'last 3 chromeandroid versions',
                      'last 3 firefox versions',
                      'last 3 opera versions',
                      'last 2 edge versions',
                      'safari >= 10',
                      'ios >= 10',
                    ],
                  },
                ],
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
            },
          },
        ],
      },
    ],
  },
  plugins: [new BundleAnalyzerPlugin({analyzerMode: 'static'})],
};

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load .env file, then let real process.env override (for CI/CD environments)
const fileEnv = dotenv.config().parsed || {};
const env = { ...fileEnv };
for (const key of Object.keys(fileEnv)) {
  if (process.env[key]) env[key] = process.env[key];
}
if (process.env.API_URL) env.API_URL = process.env.API_URL;
console.log('ENV values loaded:', env);

// Format for DefinePlugin
const envKeys = Object.entries(env).reduce((acc, [key, val]) => {
  acc[`process.env.${key}`] = JSON.stringify(val);
  return acc;
}, {});
envKeys['process.env'] = JSON.stringify(env);

module.exports = {
  entry: './client/index.jsx',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'client/index.html',
    }),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        '**/*',
        '!label_map.json',
        '!phrase_list.json',
        '!response_map.json',
        '!.gitkeep',
      ],
    }),
    new webpack.DefinePlugin(envKeys),
    new CopyWebpackPlugin({
      patterns: [{ from: 'client/source/icon', to: 'source/icon' }],
    }),
  ],
  performance: {
    maxEntrypointSize: 500000,
    maxAssetSize: 500000,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
          },
        ],
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devServer: {
    proxy: [
      {
        context: ['/'],
        target: 'http://localhost:8000',
      },
    ],
    setupMiddlewares: (middlewares, devServer) => {
      const { createProxyMiddleware } = require('http-proxy-middleware');
      devServer.app.use(
        '/off-proxy',
        createProxyMiddleware({
          target: 'https://world.openfoodfacts.org',
          pathRewrite: { '^/off-proxy': '' },
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        }),
      );
      return middlewares;
    },
    static: path.resolve(__dirname, 'build'),
    port: 4040,
    open: true,
    hot: true,
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
    publicPath: '/',
  },
};

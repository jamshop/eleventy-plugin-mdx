const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const MemoryFileSystem = require("memory-fs");
const mfs = new MemoryFileSystem();
const path = require("path");
const fs = require("fs");

const getWebpackFiles = (compiler) =>
  new Promise((resolve, reject) => {
    compiler.outputFileSystem = mfs;
    compiler.inputFileSystem = fs;
    compiler.resolvers.normal.fileSystem = mfs;
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        const errors =
          err || (stats.compilation ? stats.compilation.errors : null);
        console.log(errors);
        reject(errors);
        return;
      }
      const { compilation } = stats;
      resolve(
        Object.keys(compilation.assets).reduce((acc, key) => {
          acc[key] = compilation.assets[key].source();
          return acc;
        }, {})
      );
    });
  });

const presets = ["@babel/preset-env", "@babel/preset-react"];

const getWebpackConfig = (entry, webpackConfig) => ({
  mode: "production",
  devtool: "none",
  node: {
    fs: "empty",
  },
  entry,
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "../../memory-fs/js/"),
    library: "MDXPlugin_[name]",
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets,
          },
        },
      },
      {
        test: /\.mdx?$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets,
            },
          },
          {
            loader: "@mdx-js/loader",
            options: {
              remarkPlugins: [
                [
                  require("remark-frontmatter"),
                  { type: "yaml", marker: "-", fence: "---" },
                ],
              ],
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader",
      },
    ],
    // ToDo: add more rules and loaders?
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        sourceMap: true,
        terserOptions: { output: { comments: false } },
      }),
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: "production",
    }),
  ],
  ...webpackConfig,
});

module.exports = (entry, webpackConfig) => {
  const config = getWebpackConfig(entry, webpackConfig);
  return getWebpackFiles(webpack(config));
};
